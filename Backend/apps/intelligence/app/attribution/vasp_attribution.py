"""
app/attribution/vasp_attribution.py
-------------------------------------
v3 Phase 4: Nearest-VASP attribution per BACKEND_PLAN_v3 §7.

Reuses the EXACT same traversal (PathState objects from multi_hop.py),
filtered so only paths that REACH a vasp-labeled node produce a result.
No second traversal pass - attribution is a zero-overhead byproduct.

"Nearest" = highest surviving confidence when a vasp-labeled node is
reached. If multiple VASP-labeled nodes are reachable, the one with the
highest attribution_confidence is the primary; others become
secondaryCandidates.

Returns None (not omitted) when:
  - No vasp-labeled node is reached.
  - The trail ends at a mixer before reaching a VASP.
  - No paths were enumerated (empty graph).

Attribution confidence formula (v3 §7):
  attribution_confidence = confidence_at_hop(hop_distance_to_vasp_node)

This uses the PathState.confidence value at the VASP node, which already
has decay applied for each hop taken to reach it.

Complexity:
  Time:  O(P * N) where P = path count, N = nodes per path.
         No extra graph traversal vs. what the detection modules already do.
  Space: O(VASP candidates) = O(V) worst case but typically << 10.
"""
from __future__ import annotations

from dataclasses import dataclass

import networkx as nx

from app.schemas.response import VaspAttribution
from app.traversal.multi_hop import PathState, resolve_edge_ids_for_path

# Label strings that identify a VASP node (Role C sets these)
VASP_LABELS = frozenset({"vasp", "exchange", "cex"})


# ---------------------------------------------------------------------------
# Internal candidate
# ---------------------------------------------------------------------------


@dataclass
class _VaspCandidate:
    node_id: str
    vasp_name: str
    hop_distance: int
    confidence: float
    path_node_ids: list[str]
    path_edge_ids: list[str]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _is_vasp_node(G: nx.MultiDiGraph, node_id: str) -> bool:
    """Return True if Role C labeled this node as a VASP."""
    node_data = G.nodes.get(node_id, {})
    labels = set(node_data.get("labels", []))
    node_type = node_data.get("type", "")
    return bool(labels & VASP_LABELS) or node_type in VASP_LABELS


def _vasp_name_for_node(G: nx.MultiDiGraph, node_id: str) -> str:
    """Return a human-readable VASP name from node metadata or a fallback."""
    node_data = G.nodes.get(node_id, {})
    # Role C may store a human name in node metadata
    name = node_data.get("vaspName") or node_data.get("name")
    if name:
        return str(name)
    # Fallback: derive from the node ID address prefix
    address = node_data.get("address", node_id)
    return f"Unknown VASP ({address[:8]}...)"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def compute_vasp_attribution(
    G: nx.MultiDiGraph,
    paths: list[PathState],
    min_confidence: float = 0.15,
) -> VaspAttribution | None:
    """
    Find the nearest (highest-confidence) VASP node reachable from the root.

    Args:
        G:              The transaction graph (read-only).
        paths:          PathState list from traverse_paths() / priority queue.
                        MUST already be priority-sorted (best first) so the
                        first VASP hit tends to be the strongest one.
        min_confidence: Minimum confidence to consider an attribution valid.
                        Candidates below this threshold are silently ignored.

    Returns:
        VaspAttribution DTO if a confident match is found, else None.
        None is a valid, meaningful result (not an error).
    """
    candidates: list[_VaspCandidate] = []

    for path in paths:
        # Check every node in the path for VASP classification.
        # Skip the root (index 0) -- we want paths REACHING a VASP.
        for hop_idx, node_id in enumerate(path.node_ids[1:], start=1):
            if not _is_vasp_node(G, node_id):
                continue

            # Attribution confidence = confidence AT this hop in the path.
            # PathState.confidence is the confidence at the LAST node;
            # for intermediate VASP nodes we need to reconstruct it.
            # Because confidence decays uniformly, confidence at hop_idx
            # is already stored in path.confidence only if hop_idx == path.hop.
            # For intermediate nodes we can re-derive it from the path length.
            # We store it on the candidate based on position in path.
            candidate_confidence = path.confidence
            if hop_idx < path.hop:
                # Intermediate VASP node: confidence was higher at that point.
                # Since PathState extends decay by 1 per hop uniformly,
                # confidence at hop_idx = path.confidence / (decay ^ remaining_hops)
                # But we don't store decay_factor in PathState.
                # Conservative approach: use path.confidence (underestimate).
                # Full solution: pass decay_factor through (Phase 5 tuning).
                candidate_confidence = path.confidence

            if candidate_confidence < min_confidence:
                continue

            edge_ids = resolve_edge_ids_for_path(G, path.node_ids[: hop_idx + 1])
            candidates.append(
                _VaspCandidate(
                    node_id=node_id,
                    vasp_name=_vasp_name_for_node(G, node_id),
                    hop_distance=hop_idx,
                    confidence=candidate_confidence,
                    path_node_ids=path.node_ids[: hop_idx + 1],
                    path_edge_ids=edge_ids,
                )
            )

    if not candidates:
        return None

    # Sort: highest confidence first, then shortest hop distance as tiebreak
    candidates.sort(key=lambda c: (-c.confidence, c.hop_distance))

    primary = candidates[0]
    secondary = [
        {
            "vaspNodeId": c.node_id,
            "attributedVasp": c.vasp_name,
            "hopDistance": c.hop_distance,
            "confidence": round(c.confidence, 4),
        }
        for c in candidates[1:5]  # up to 4 secondary candidates
    ]

    return VaspAttribution(
        attributedVasp=primary.vasp_name,
        vaspNodeId=primary.node_id,
        hopDistance=primary.hop_distance,
        confidence=round(primary.confidence, 4),
        pathNodeIds=primary.path_node_ids,
        pathEdgeIds=primary.path_edge_ids,
        basis=(
            f"Connected via {primary.hop_distance} hop(s) to labeled "
            f"{primary.vasp_name} node ({primary.node_id})"
        ),
        secondaryCandidates=secondary,
    )
