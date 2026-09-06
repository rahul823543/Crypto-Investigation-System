"""
app/traversal/priority_queue.py
--------------------------------
v3 Phase 4: Suspicion-first priority queue per BACKEND_PLAN_v3 §7.

Replaces the raw DFS order from Phase 3 with a priority queue that scores
each PathState by BEHAVIOR SIGNALS, not transaction value. This ensures
that a small structuring transfer in an obvious fan-out is explored before
a large, unremarkable transfer.

Priority score formula (v3 §7):
  priority_score(path) = weighted sum of:
    - fan_out_detected          (bool)
    - touches_risky_label       (bool)
    - dex_or_bridge_touchpoint  (bool)
    - speed_of_movement         (bool - funds moved within RAPID_WINDOW_SECONDS)
    - confidence_at_current_hop (float, scales 0.0-1.0)

The module exposes one public function: rank_paths_by_priority().
It takes raw PathState objects from multi_hop.traverse_paths() and returns
them sorted highest-to-lowest priority for downstream detectors.

Complexity:
  Time:  O(P * N) per call where P = path count, N = nodes per path.
         With MAX_TOTAL_PATHS=500 and avg depth ~4, this is ~2000 ops.
  Space: O(P) for the scored list.
"""
from __future__ import annotations

import heapq
from dataclasses import dataclass, field

import networkx as nx

from app.traversal.multi_hop import PathState

# ---------------------------------------------------------------------------
# Scoring weights (behavior-signal, not value-based)
# ---------------------------------------------------------------------------
WEIGHT_FAN_OUT = 40
WEIGHT_RISKY_LABEL = 35
WEIGHT_DEX_OR_BRIDGE = 20
WEIGHT_RAPID_MOVEMENT = 30
WEIGHT_CONFIDENCE = 25  # scaled: confidence * WEIGHT_CONFIDENCE

# A path is "rapid" if any node in it has an outgoing edge within this window
RAPID_WINDOW_SECONDS = 1800  # 30 minutes

# Risky label strings produced by Role C node classification
RISKY_LABELS = frozenset({"sanctioned", "risky", "high_risk", "mixer"})
DEX_BRIDGE_LABELS = frozenset({"dex", "bridge"})


# ---------------------------------------------------------------------------
# Priority-scored path
# ---------------------------------------------------------------------------


@dataclass(order=True)
class ScoredPath:
    """A PathState paired with its priority score for heap ordering."""

    # Negated so heapq (min-heap) gives highest scores first
    neg_priority: float = field(compare=True)
    path: PathState = field(compare=False)

    @property
    def priority(self) -> float:
        return -self.neg_priority


# ---------------------------------------------------------------------------
# Signal detection helpers (graph-node based, not value based)
# ---------------------------------------------------------------------------


def _has_fan_out(G: nx.MultiDiGraph, path: PathState) -> bool:
    """True if any node in the path has out-degree >= 3 (fan-out pattern)."""
    for node_id in path.node_ids:
        if G.out_degree(node_id) >= 3:
            return True
    return False


def _touches_risky_label(G: nx.MultiDiGraph, path: PathState) -> bool:
    """True if any node carries a risky classification label from Role C."""
    for node_id in path.node_ids:
        node_data = G.nodes.get(node_id, {})
        labels = set(node_data.get("labels", []))
        if labels & RISKY_LABELS:
            return True
    return False


def _touches_dex_or_bridge(G: nx.MultiDiGraph, path: PathState) -> bool:
    """True if any node is a DEX router or bridge contract."""
    for node_id in path.node_ids:
        node_data = G.nodes.get(node_id, {})
        node_type = node_data.get("type", "")
        labels = set(node_data.get("labels", []))
        if node_type in DEX_BRIDGE_LABELS or labels & DEX_BRIDGE_LABELS:
            return True
    return False


def _is_rapid_movement(G: nx.MultiDiGraph, path: PathState) -> bool:
    """
    True if the path traverses more than one hop and all edges along it
    were created within RAPID_WINDOW_SECONDS of each other.

    Uses edge timestamps stored on the graph. If timestamp data is absent
    (e.g. seeded demo), defaults to False (conservative).
    """
    if len(path.node_ids) < 3:
        return False  # need at least 2 hops for timing comparison

    timestamps: list[float] = []
    for u, v in zip(path.node_ids[:-1], path.node_ids[1:]):
        if not G.has_edge(u, v):
            continue
        for edge_data in G[u][v].values():
            ts = edge_data.get("timestamp_epoch")
            if ts is not None:
                timestamps.append(float(ts))
                break

    if len(timestamps) < 2:
        return False

    return (max(timestamps) - min(timestamps)) <= RAPID_WINDOW_SECONDS


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------


def score_path(G: nx.MultiDiGraph, path: PathState) -> float:
    """
    Compute the priority score for a single path using behavior signals.

    Higher = more suspicious = explored first by the priority queue.
    Score is NOT bounded to [0, 100] — it is an ordering key only.
    The risk_score module produces the bounded [0, 100] output score.
    """
    score = 0.0

    if _has_fan_out(G, path):
        score += WEIGHT_FAN_OUT
    if _touches_risky_label(G, path):
        score += WEIGHT_RISKY_LABEL
    if _touches_dex_or_bridge(G, path):
        score += WEIGHT_DEX_OR_BRIDGE
    if _is_rapid_movement(G, path):
        score += WEIGHT_RAPID_MOVEMENT

    # Confidence contribution: higher residual confidence -> higher priority
    score += path.confidence * WEIGHT_CONFIDENCE

    return score


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def rank_paths_by_priority(
    G: nx.MultiDiGraph,
    paths: list[PathState],
) -> list[PathState]:
    """
    Return paths sorted highest-priority first using a min-heap.

    Args:
        G:     The transaction graph (read-only; used for node/edge signal checks).
        paths: Raw PathState list from traverse_paths().

    Returns:
        Same paths re-ordered highest priority first.
        Empty input -> empty output.
    """
    if not paths:
        return []

    heap: list[ScoredPath] = []
    for path in paths:
        priority = score_path(G, path)
        heapq.heappush(heap, ScoredPath(neg_priority=-priority, path=path))

    # Extract in descending priority order
    return [heapq.heappop(heap).path for _ in range(len(heap))]


def get_path_signals(G: nx.MultiDiGraph, path: PathState) -> list[str]:
    """
    Return the list of reason-code strings that fired for this path.
    Used by suspicious_paths.py to populate SuspiciousPath.reason_codes.
    """
    signals: list[str] = []
    if _has_fan_out(G, path):
        signals.append("fan_out_detected")
    if _touches_risky_label(G, path):
        signals.append("touches_risky_label")
    if _touches_dex_or_bridge(G, path):
        signals.append("dex_or_bridge_touchpoint")
    if _is_rapid_movement(G, path):
        signals.append("rapid_movement")
    return signals
