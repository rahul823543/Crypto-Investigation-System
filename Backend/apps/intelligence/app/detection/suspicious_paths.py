"""
app/detection/suspicious_paths.py
──────────────────────────────────
Phase 3: Heuristic detection of suspicious fund-movement paths.

Each path (a list of node IDs from multi_hop.traverse_paths) is evaluated
against independent forensic signals. A path is "suspicious" when it fires
at least one signal. The signals are additive — a path can carry multiple.

Signals (from BACKEND_PLAN §7):
  rapid_movement    — all edge timestamps within a 30-minute window
  fan_out_relay     — path >= 2 hops originating from a fanning-out node (out-degree >= 3)
  circular_return   — path touches a detected elementary circular flow
  risky_label       — any node carries label 'risky', 'ofac', or high risk level
  dex_touchpoint    — any non-root node has type or label 'dex'
  bridge_touchpoint — any node has type or label 'bridge'
  mixer_touchpoint  — any node has type or label 'mixer'
  high_value        — total amount_usd across path edges >= $5,000

Design:
  - Pure function: (G, paths, circular_flows) → SuspiciousPath list.
  - Each signal check is an isolated helper returning True/False.
  - Edge data is accessed across all parallel edges in MultiDiGraph.
  - Timestamps are parsed as ISO-8601 or datetime objects.
  - score starts at 0; path_ranker.py assigns final scores/ranks.
"""
from __future__ import annotations

from datetime import datetime

import networkx as nx

from app.schemas.response import CircularFlow, SuspiciousPath
from app.traversal.multi_hop import resolve_edge_ids_for_path

# Threshold for rapid-movement signal (seconds) — 30 minutes
RAPID_MOVEMENT_WINDOW_SECONDS = 1800

# Threshold for high-value signal (USD)
HIGH_VALUE_THRESHOLD_USD = 5000.0


def detect_suspicious_paths(
    G: nx.MultiDiGraph,
    paths: list[list[str]],
    circular_flows: list[CircularFlow] | None = None,
) -> list[SuspiciousPath]:
    """
    Evaluate every path against heuristic signals and return a
    SuspiciousPath for each path that fires at least one signal.

    Args:
        G:              Full transaction graph.
        paths:          Output of traverse_paths() — list of node-ID lists.
        circular_flows: Optional list of detected CircularFlow objects to
                        identify paths participating in cycles.

    Returns:
        List of SuspiciousPath DTOs (score=0, rank=1 — filled by ranker).
    """
    results: list[SuspiciousPath] = []

    cycle_nodes: set[str] = set()
    if circular_flows:
        for flow in circular_flows:
            cycle_nodes.update(flow.node_ids)

    for idx, path in enumerate(paths, start=1):
        reason_codes = _evaluate_signals(G, path, cycle_nodes)
        if not reason_codes:
            continue  # Clean path — not suspicious

        edge_ids = resolve_edge_ids_for_path(G, path)

        results.append(
            SuspiciousPath(
                id=f"path_{idx:03d}",
                rank=1,       # Placeholder — overwritten by path_ranker.rank_paths()
                score=0,      # Placeholder — overwritten by path_ranker.rank_paths()
                nodeIds=path,
                edgeIds=edge_ids,
                reasonCodes=reason_codes,
                summary=_build_summary(path, reason_codes, G),
            )
        )

    return results


# ---------------------------------------------------------------------------
# Signal evaluators
# ---------------------------------------------------------------------------


def _evaluate_signals(
    G: nx.MultiDiGraph,
    path: list[str],
    cycle_nodes: set[str],
) -> list[str]:
    """Run all signal checks and return list of fired reason codes."""
    codes: list[str] = []

    if _is_rapid_movement(G, path):
        codes.append("rapid_movement")
    if _has_fan_out_relay(G, path):
        codes.append("fan_out_relay")
    if _overlaps_circular_flow(path, cycle_nodes):
        codes.append("circular_return")
    if _has_risky_label(G, path):
        codes.append("risky_label")
    if _has_dex_touchpoint(G, path):
        codes.append("dex_touchpoint")
    if _has_bridge_touchpoint(G, path):
        codes.append("bridge_touchpoint")
    if _has_mixer_touchpoint(G, path):
        codes.append("mixer_touchpoint")
    if _is_high_value(G, path):
        codes.append("high_value")

    return codes


def _is_rapid_movement(G: nx.MultiDiGraph, path: list[str]) -> bool:
    """True if all edge timestamps in the path span < RAPID_MOVEMENT_WINDOW_SECONDS."""
    timestamps: list[datetime] = []

    for u, v in zip(path[:-1], path[1:]):
        if not G.has_edge(u, v):
            return False

        # Gather the first valid timestamp between u and v
        edge_found = False
        for edge_data in G[u][v].values():
            raw = edge_data.get("timestamp")
            if raw is None:
                continue
            if isinstance(raw, datetime):
                timestamps.append(raw)
                edge_found = True
                break
            elif isinstance(raw, str):
                try:
                    ts = datetime.fromisoformat(raw.replace("Z", "+00:00"))
                    timestamps.append(ts)
                    edge_found = True
                    break
                except (ValueError, AttributeError):
                    continue

        if not edge_found:
            return False

    if len(timestamps) < 2:
        return False

    span = (max(timestamps) - min(timestamps)).total_seconds()
    return 0 <= span < RAPID_MOVEMENT_WINDOW_SECONDS


def _has_fan_out_relay(G: nx.MultiDiGraph, path: list[str]) -> bool:
    """
    True if the path represents a relay of funds following a fan-out.
    A path is a fan-out relay when:
      1. It has at least 2 hops (len(path) >= 3, e.g. Root -> Relay -> Destination).
      2. The source node or an intermediary has an out-degree >= 3
         (indicating a 1-to-many dispersion pattern).
    """
    if len(path) < 3:
        return False

    for node_id in path[:-1]:
        if G.has_node(node_id) and G.out_degree(node_id) >= 3:
            return True
    return False


def _overlaps_circular_flow(path: list[str], cycle_nodes: set[str]) -> bool:
    """True if any node in the path participates in a detected circular flow."""
    return bool(cycle_nodes and any(n in cycle_nodes for n in path))


def _has_risky_label(G: nx.MultiDiGraph, path: list[str]) -> bool:
    """True if any non-root node carries 'risky', 'ofac', or high risk level."""
    for node_id in path:
        if not G.has_node(node_id):
            continue
        labels = set(G.nodes[node_id].get("labels", []))
        if labels.intersection({"risky", "ofac", "sanctioned"}):
            return True
        # Check high risk level on non-root or non-source nodes
        if G.nodes[node_id].get("risk_level") in {"high", "critical"}:
            if node_id != path[0] or "root" not in labels:
                return True
    return False


def _has_dex_touchpoint(G: nx.MultiDiGraph, path: list[str]) -> bool:
    """True if any non-root node (index > 0) has type or label 'dex'."""
    for node_id in path[1:]:
        if not G.has_node(node_id):
            continue
        if G.nodes[node_id].get("type") == "dex" or "dex" in G.nodes[node_id].get("labels", []):
            return True
    return False


def _has_bridge_touchpoint(G: nx.MultiDiGraph, path: list[str]) -> bool:
    """True if any node in the path has type or label 'bridge'."""
    for node_id in path:
        if not G.has_node(node_id):
            continue
        if G.nodes[node_id].get("type") == "bridge" or "bridge" in G.nodes[node_id].get("labels", []):
            return True
    return False


def _has_mixer_touchpoint(G: nx.MultiDiGraph, path: list[str]) -> bool:
    """True if any node in the path has type or label 'mixer'."""
    for node_id in path:
        if not G.has_node(node_id):
            continue
        if G.nodes[node_id].get("type") == "mixer" or "mixer" in G.nodes[node_id].get("labels", []):
            return True
    return False


def _is_high_value(G: nx.MultiDiGraph, path: list[str]) -> bool:
    """True if the sum of amount_usd across all path edges exceeds HIGH_VALUE_THRESHOLD_USD."""
    total = 0.0
    for u, v in zip(path[:-1], path[1:]):
        if not G.has_edge(u, v):
            continue
        for edge_data in G[u][v].values():
            total += float(edge_data.get("amount_usd", 0.0))
    return total >= HIGH_VALUE_THRESHOLD_USD


# ---------------------------------------------------------------------------
# Summary builder
# ---------------------------------------------------------------------------


def _build_summary(
    path: list[str],
    reason_codes: list[str],
    G: nx.MultiDiGraph,
) -> str:
    """
    Produce a one-line human-readable summary for the report.
    Example: "2-hop suspicious path via wallet:0x1111222233… (rapid_movement, high_value)"
    """
    hop_count = len(path) - 1
    signals_str = ", ".join(reason_codes)

    if hop_count <= 1:
        target_id = path[1] if len(path) > 1 else path[0]
        target_type = G.nodes[target_id].get("type", "node") if G.has_node(target_id) else "node"
        target_addr = (G.nodes[target_id].get("address", target_id) if G.has_node(target_id) else target_id)[:10]
        return f"Direct transfer to {target_type}:{target_addr}… ({signals_str})"

    # Multi-hop: use the first intermediary as the "via" point
    via_id = path[1]
    via_type = G.nodes[via_id].get("type", "node") if G.has_node(via_id) else "node"
    via_addr = (G.nodes[via_id].get("address", via_id) if G.has_node(via_id) else via_id)[:10]
    return f"{hop_count}-hop suspicious path via {via_type}:{via_addr}… ({signals_str})"

