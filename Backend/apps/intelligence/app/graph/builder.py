"""
app/graph/builder.py
────────────────────
Phase 2: Parse an AnalysisRequest into an in-memory nx.DiGraph.

Design decisions:
  - Node keys are the stable IDs from Role C ("wallet:0x...", "dex:0x...", etc.)
    so Phase 3-4 algorithms never need to re-derive them.
  - All GraphNode and GraphEdge fields are stored as node/edge attributes so
    algorithms can read them with G.nodes[node_id] and G.edges[u, v] without
    touching the original request object.
  - Graph-level metadata (caseId, rootAddress, maxDepth) is stored in
    G.graph so it travels with the graph through every pipeline step.
  - An empty AnalysisRequest (no nodes, no edges) produces a valid empty
    DiGraph — no special-casing needed downstream.

Phase 3 will add helper queries on top of this graph.
Phase 4 will pass the graph to multi-hop traversal and cycle detection.
"""
from __future__ import annotations

import networkx as nx

from app.schemas.request import AnalysisRequest


def build_graph(request: AnalysisRequest) -> nx.DiGraph:
    """
    Convert an AnalysisRequest into a directed graph.

    Nodes:
        G.nodes[node_id] contains:
            address, type, labels, risk_level, total_in_usd, total_out_usd

    Edges:
        G.edges[from_id, to_id] contains:
            id, transaction_hash, asset, amount, amount_usd,
            timestamp, hop_depth, risk_level

    Graph-level metadata:
        G.graph["case_id"], G.graph["root_address"], G.graph["max_depth"]

    Returns:
        nx.DiGraph — may be empty if request.nodes and request.edges are empty.
    """
    G: nx.DiGraph = nx.DiGraph()

    # Store request-level metadata on the graph object itself so it is
    # available to every downstream algorithm without re-passing the request.
    G.graph["case_id"] = request.case_id
    G.graph["root_address"] = request.root_address
    G.graph["max_depth"] = request.max_depth

    for node in request.nodes:
        G.add_node(
            node.id,
            address=node.address,
            type=node.type,
            labels=node.labels,
            risk_level=node.risk_level,
            total_in_usd=node.total_in_usd,
            total_out_usd=node.total_out_usd,
        )

    for edge in request.edges:
        G.add_edge(
            edge.from_node,
            edge.to_node,
            id=edge.id,
            transaction_hash=edge.transaction_hash,
            asset=edge.asset,
            amount=edge.amount,
            amount_usd=edge.amount_usd,
            timestamp=edge.timestamp,
            hop_depth=edge.hop_depth,
            risk_level=edge.risk_level,
        )

    return G


def get_root_node_id(G: nx.DiGraph) -> str | None:
    """
    Return the node ID whose ``address`` attribute matches the graph's
    ``root_address`` metadata (case-insensitive).

    Used by Phase 4 traversal as the BFS start node.
    Returns None when the graph is empty or the root address is absent.
    """
    root_address = G.graph.get("root_address", "").lower()
    if not root_address:
        return None
    for node_id, data in G.nodes(data=True):
        if data.get("address", "").lower() == root_address:
            return node_id
    return None
