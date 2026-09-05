"""
app/detection/circular_flows.py
────────────────────────────────
Phase 3: Circular-flow detection via elementary cycle enumeration.

Design:
  - Uses nx.simple_cycles() which finds all elementary directed cycles
    (Johnson's algorithm, O((n+e)(c+1)) where c = number of cycles).
  - A "circular flow" occurs when funds leave a node and eventually return
    to the same node — indicating potential layering or wash-trading.
  - Each cycle is converted to a CircularFlow response DTO.
  - Edge IDs are resolved for the first parallel edge between each pair
    of consecutive nodes in the cycle.
  - Cycles of length 1 (self-loops) are skipped — not forensically relevant.
  - Hard cap of MAX_CYCLES prevents pathological output on dense graphs.
"""
from __future__ import annotations

import networkx as nx

from app.schemas.response import CircularFlow

MAX_CYCLES = 50


def detect_circular_flows(G: nx.MultiDiGraph) -> list[CircularFlow]:
    """
    Find all elementary directed cycles in the graph and return them as
    CircularFlow DTOs.

    Args:
        G: The full transaction graph (MultiDiGraph).

    Returns:
        List of CircularFlow objects, one per detected cycle.
        Empty list if no cycles exist or the graph is empty.
    """
    if G.number_of_nodes() == 0:
        return []

    flows: list[CircularFlow] = []

    for idx, cycle_nodes in enumerate(nx.simple_cycles(G), start=1):
        # Skip trivial self-loops
        if len(cycle_nodes) < 2:
            continue

        edge_ids = _resolve_cycle_edges(G, cycle_nodes)

        summary = _build_summary(cycle_nodes, G)

        flows.append(
            CircularFlow(
                id=f"cycle_{idx:03d}",
                nodeIds=cycle_nodes,
                edgeIds=edge_ids,
                cycleLength=len(cycle_nodes),
                summary=summary,
            )
        )

        if len(flows) >= MAX_CYCLES:
            break

    return flows


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _resolve_cycle_edges(G: nx.MultiDiGraph, cycle_nodes: list[str]) -> list[str]:
    """
    Return edge IDs for each consecutive pair in the cycle, including the
    wrap-around edge from the last node back to the first.
    """
    edge_ids: list[str] = []
    pairs = list(zip(cycle_nodes, cycle_nodes[1:])) + [(cycle_nodes[-1], cycle_nodes[0])]

    for u, v in pairs:
        if G.has_edge(u, v):
            for edge_data in G[u][v].values():
                eid = edge_data.get("id")
                if eid:
                    edge_ids.append(eid)
                    break

    return edge_ids


def _build_summary(cycle_nodes: list[str], G: nx.MultiDiGraph) -> str:
    """
    Produce a human-readable summary for the cycle.
    Example: "Circular flow: wallet:0x1111222233… → dex:0x4444555566… → wallet:0x1111222233…"
    """
    short = []
    for node_id in cycle_nodes:
        addr = G.nodes[node_id].get("address", node_id)
        ntype = G.nodes[node_id].get("type", "node")
        short.append(f"{ntype}:{addr[:10]}…")

    chain = " → ".join(short) + f" → {short[0]}"
    return f"Circular flow detected ({len(cycle_nodes)} nodes): {chain}"
