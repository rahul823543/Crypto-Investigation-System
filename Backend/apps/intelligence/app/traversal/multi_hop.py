"""
app/traversal/multi_hop.py
--------------------------
v3 Phase 4: Confidence-decay multi-hop traversal per BACKEND_PLAN_v3 §7.

Replaces the old fixed-depth DFS with a stopping model driven by three
independent conditions (any one triggers a stop):

  1. Confidence decay below minConfidence
       confidence_at_hop(n) < min_confidence
       With default decay=0.65 and minConfidence=0.15 this triggers at hop 5,
       so hardCeilingDepth rarely fires in practice.

  2. isTraceableDeadEnd flag on the CURRENT node
       Mixer/VASP/unlabeled-hub nodes: Role C already determined that
       the trail ends here. Python trusts that flag — label logic lives
       in Node.js, not here.

  3. hardCeilingDepth safety valve
       Prevents pathological graphs from hanging a live demo.

Paths are collected by the CALLER (priority_queue.py) which drives the
BFS/DFS order. This module provides the path state object and the
per-node stopping decision only.

Complexity:
  Time:  O(V + E) amortized per path; total bounded by MAX_TOTAL_PATHS.
  Space: O(depth) per stack frame; O(MAX_TOTAL_PATHS * avg_depth) for results.
         Depth is bounded by hardCeilingDepth (default 10), so in practice
         each frame is tiny.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import networkx as nx

from app.graph.builder import get_root_node_id
from app.traversal.confidence import confidence_at_hop, is_below_threshold

# Hard cap on total paths collected — prevents OOM on very dense graphs.
# Priority queue callers explore the best paths first, so the first
# MAX_TOTAL_PATHS results are the most suspicious ones.
MAX_TOTAL_PATHS = 500


# ---------------------------------------------------------------------------
# Path state (passed through the traversal loop)
# ---------------------------------------------------------------------------


@dataclass
class PathState:
    """
    Immutable-ish snapshot of a partially-explored path.

    node_ids    — ordered node IDs visited so far (last = current node).
    hop         — number of hops taken from root (0 = root itself).
    confidence  — decayed confidence at the current node.
    visited_set — O(1) membership test for simple-path enforcement.
    """

    node_ids: list[str]
    hop: int
    confidence: float
    visited_set: set[str] = field(default_factory=set, repr=False)

    @classmethod
    def from_root(cls, root_id: str, base_confidence: float = 1.0) -> "PathState":
        return cls(
            node_ids=[root_id],
            hop=0,
            confidence=base_confidence,
            visited_set={root_id},
        )

    @property
    def current_node(self) -> str:
        return self.node_ids[-1]

    def extend(
        self,
        next_node: str,
        new_confidence: float,
    ) -> "PathState":
        """Return a new PathState extended by one hop to next_node."""
        new_hop = self.hop + 1
        return PathState(
            node_ids=self.node_ids + [next_node],
            hop=new_hop,
            confidence=new_confidence,
            visited_set=self.visited_set | {next_node},
        )


# ---------------------------------------------------------------------------
# Stopping condition
# ---------------------------------------------------------------------------


def should_stop_at_node(
    G: nx.MultiDiGraph,
    node_id: str,
    current_hop: int,
    current_confidence: float,
    min_confidence: float,
    hard_ceiling_depth: int,
    hub_threshold: int,
) -> bool:
    """
    Return True if traversal must NOT expand past this node.

    Three independent conditions — any one is sufficient to stop:

      1. Confidence below threshold (decay model).
      2. isTraceableDeadEnd flag set by Role C (mixer/VASP/hub).
      3. hardCeilingDepth safety valve reached.

    Note: unlabeled hubs (outDegree > hubThreshold) are flagged by Role C
    via isTraceableDeadEnd. Python trusts that flag rather than re-checking
    outDegree, keeping label logic in one place.
    """
    node_data = G.nodes.get(node_id, {})

    # Condition 1: confidence too low
    if current_confidence < min_confidence:
        return True

    # Condition 2: Role C flagged this as a dead end (mixer/VASP/hub)
    if node_data.get("isTraceableDeadEnd", False):
        return True

    # Condition 2b: DEFENSIVE safety - if Role C missed labeling a massive hub
    if G.out_degree(node_id) >= hub_threshold:
        return True

    # Condition 3: safety ceiling
    if current_hop >= hard_ceiling_depth:
        return True

    return False


# ---------------------------------------------------------------------------
# Core traversal
# ---------------------------------------------------------------------------


def traverse_paths(
    G: nx.MultiDiGraph,
    min_confidence: float = 0.15,
    decay_factor: float = 0.65,
    hard_ceiling_depth: int = 10,
    hub_threshold: int = 500,
) -> list[PathState]:
    """
    Enumerate paths from the root node using confidence-decay stopping.

    Returns up to MAX_TOTAL_PATHS PathState objects. The caller
    (priority_queue.py) is responsible for ordering — paths are returned
    in DFS discovery order so the priority queue can re-sort them.

    Args:
        G:                   Full transaction graph (MultiDiGraph).
        min_confidence:      Stop a path when decayed confidence < this.
        decay_factor:        Per-hop confidence retention (e.g. 0.65).
        hard_ceiling_depth:  Safety-valve hop limit (default 10).
        hub_threshold:       Not used here; Role C sets isTraceableDeadEnd.
                             Kept for API symmetry with the request schema.

    Returns:
        List of PathState objects for complete paths (length >= 2 nodes).
        Empty list if graph is empty or root is missing.
    """
    root_id = get_root_node_id(G)
    if root_id is None or G.number_of_nodes() == 0:
        return []

    completed: list[PathState] = []
    # DFS stack of PathState objects (not yet stopped, not yet a leaf)
    stack: list[PathState] = [PathState.from_root(root_id)]

    while stack and len(completed) < MAX_TOTAL_PATHS:
        state = stack.pop()
        node = state.current_node

        # Evaluate each neighbor
        expanded = False
        for neighbor in G.successors(node):
            # Simple-path guard: no revisiting within the same path
            if neighbor in state.visited_set:
                continue

            next_confidence = confidence_at_hop(state.confidence, decay_factor, 1)
            next_hop = state.hop + 1

            next_state = state.extend(neighbor, next_confidence)

            # Any path reaching a new node is a result (length >= 2)
            completed.append(next_state)
            if len(completed) >= MAX_TOTAL_PATHS:
                break

            # Only push onto the stack if we should continue expanding
            stopped = should_stop_at_node(
                G,
                neighbor,
                next_hop,
                next_confidence,
                min_confidence,
                hard_ceiling_depth,
                hub_threshold,
            )
            if not stopped:
                stack.append(next_state)
            expanded = True

        _ = expanded  # suppress unused-variable warning

    return completed


# ---------------------------------------------------------------------------
# Edge ID resolution (unchanged from Phase 3, used by detection modules)
# ---------------------------------------------------------------------------


def resolve_edge_ids_for_path(
    G: nx.MultiDiGraph,
    node_ids: list[str],
) -> list[str]:
    """
    Given an ordered list of node IDs, return the edge IDs for the first
    parallel edge between each consecutive pair.

    Used by suspicious_paths.py and vasp_attribution.py to populate edgeIds.
    Returns [] for paths with fewer than 2 nodes.
    """
    if len(node_ids) < 2:
        return []

    edge_ids: list[str] = []
    for u, v in zip(node_ids[:-1], node_ids[1:]):
        if not G.has_edge(u, v):
            continue
        for edge_data in G[u][v].values():
            edge_id = edge_data.get("id")
            if edge_id:
                edge_ids.append(edge_id)
                break

    return edge_ids
