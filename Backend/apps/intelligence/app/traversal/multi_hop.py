"""
app/traversal/multi_hop.py
──────────────────────────
Phase 3: Bounded DFS path enumeration from the root node.

Design:
  - Uses an explicit stack-based DFS bounded by max_depth to find all
    simple paths starting from the root node (no node revisited within a path).
  - Returns raw node-ID paths; edge IDs are resolved lazily by callers
    that need them (e.g. suspicious_paths.py).
  - Hard cap of MAX_PATHS prevents memory explosion on dense graphs.
    Paths are yielded in DFS order so the first MAX_PATHS are the
    shortest/shallowest — most forensically relevant.
  - Returns [] on empty graph or missing root — never raises.
"""
from __future__ import annotations

import networkx as nx

from app.graph.builder import get_root_node_id

# Safety cap — avoids OOM on large or highly-connected graphs.
MAX_PATHS = 500


def traverse_paths(
    G: nx.MultiDiGraph,
    max_depth: int,
) -> list[list[str]]:
    """
    Return all simple directed paths reachable from the root node up to
    ``max_depth`` hops.

    Each path is a list of node IDs in traversal order, starting from the
    root:
        ["wallet:0x111...", "dex:0x222...", "wallet:0x333..."]

    Args:
        G:         The full transaction graph (MultiDiGraph).
        max_depth: Maximum hop count (1–3 for MVP). Paths longer than
                   this are not returned.

    Returns:
        List of node-ID paths. Empty list if the graph is empty,
        the root node cannot be found, or no paths exist within the
        given depth limit.
    """
    root_id = get_root_node_id(G)
    if root_id is None or G.number_of_nodes() == 0:
        return []

    paths: list[list[str]] = []

    # Manual DFS: stack contains (current_node, path_so_far).
    # We avoid nx.all_simple_paths because older NetworkX versions require
    # an explicit target argument.
    stack: list[tuple[str, list[str]]] = [(root_id, [root_id])]

    while stack and len(paths) < MAX_PATHS:
        node, current_path = stack.pop()

        for neighbor in G.successors(node):
            # Guard: simple paths only — no revisiting
            if neighbor in current_path:
                continue

            new_path = current_path + [neighbor]

            # Any path of length >= 2 is a valid result
            paths.append(new_path)
            if len(paths) >= MAX_PATHS:
                break

            # Only recurse if we haven't hit the depth cap
            if len(new_path) - 1 < max_depth:
                stack.append((neighbor, new_path))

    return paths


def resolve_edge_ids_for_path(
    G: nx.MultiDiGraph,
    path: list[str],
) -> list[str]:
    """
    Given an ordered list of node IDs, return the edge IDs for the first
    parallel edge between each consecutive pair.

    Used by suspicious_paths.py to populate SuspiciousPath.edge_ids.
    Returns [] for paths with fewer than 2 nodes.
    """
    if len(path) < 2:
        return []

    edge_ids: list[str] = []
    for u, v in zip(path[:-1], path[1:]):
        if not G.has_edge(u, v):
            continue
        # G[u][v] is a dict of {key: attr_dict} for MultiDiGraph.
        # Find the first edge attribute dictionary that carries a valid id.
        for edge_data in G[u][v].values():
            edge_id = edge_data.get("id")
            if edge_id:
                edge_ids.append(edge_id)
                break

    return edge_ids
