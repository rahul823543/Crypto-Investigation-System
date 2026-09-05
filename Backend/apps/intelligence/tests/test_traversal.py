"""
tests/test_traversal.py
────────────────────────
Unit tests for app/traversal/multi_hop.py.

Fixtures:
  linear_graph    — root → A → B (3 nodes, depth 2)
  branching_graph — root → A, root → B, A → C (4 nodes)
  empty_graph     — no nodes, no edges
  single_graph    — root only, no edges
"""
from __future__ import annotations

import networkx as nx
import pytest

from app.graph.builder import build_graph
from app.schemas.request import AnalysisRequest
from app.traversal.multi_hop import MAX_PATHS, resolve_edge_ids_for_path, traverse_paths


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

ROOT = "wallet:0xaaaa000000000000000000000000000000000000"
NODE_A = "wallet:0xaaaa000000000000000000000000000000000001"
NODE_B = "wallet:0xaaaa000000000000000000000000000000000002"
NODE_C = "wallet:0xaaaa000000000000000000000000000000000003"


def _make_graph(nodes: list[dict], edges: list[dict]) -> nx.MultiDiGraph:
    """Build a MultiDiGraph directly for traversal tests."""
    G = nx.MultiDiGraph()
    G.graph["root_address"] = "0xaaaa000000000000000000000000000000000000"
    G.graph["max_depth"] = 3
    for node in nodes:
        G.add_node(node["id"], **{k: v for k, v in node.items() if k != "id"})
    for edge in edges:
        G.add_edge(
            edge["from_node"],
            edge["to_node"],
            id=edge.get("id", "edge_x"),
            amount_usd=edge.get("amount_usd", 0.0),
            timestamp=edge.get("timestamp", "2026-01-01T00:00:00Z"),
        )
    return G


@pytest.fixture
def linear_graph() -> nx.MultiDiGraph:
    """root → A → B — depth-2 linear chain."""
    return _make_graph(
        nodes=[
            {"id": ROOT, "address": "0xaaaa000000000000000000000000000000000000", "type": "wallet", "labels": [], "risk_level": "low", "total_in_usd": 0, "total_out_usd": 0},
            {"id": NODE_A, "address": "0xaaaa000000000000000000000000000000000001", "type": "wallet", "labels": [], "risk_level": "low", "total_in_usd": 0, "total_out_usd": 0},
            {"id": NODE_B, "address": "0xaaaa000000000000000000000000000000000002", "type": "wallet", "labels": [], "risk_level": "low", "total_in_usd": 0, "total_out_usd": 0},
        ],
        edges=[
            {"from_node": ROOT, "to_node": NODE_A, "id": "edge_root_a"},
            {"from_node": NODE_A, "to_node": NODE_B, "id": "edge_a_b"},
        ],
    )


@pytest.fixture
def branching_graph() -> nx.MultiDiGraph:
    """root → A, root → B, A → C — fan-out structure."""
    return _make_graph(
        nodes=[
            {"id": ROOT, "address": "0xaaaa000000000000000000000000000000000000", "type": "wallet", "labels": [], "risk_level": "low", "total_in_usd": 0, "total_out_usd": 0},
            {"id": NODE_A, "address": "0xaaaa000000000000000000000000000000000001", "type": "wallet", "labels": [], "risk_level": "low", "total_in_usd": 0, "total_out_usd": 0},
            {"id": NODE_B, "address": "0xaaaa000000000000000000000000000000000002", "type": "wallet", "labels": [], "risk_level": "low", "total_in_usd": 0, "total_out_usd": 0},
            {"id": NODE_C, "address": "0xaaaa000000000000000000000000000000000003", "type": "dex",    "labels": [], "risk_level": "low", "total_in_usd": 0, "total_out_usd": 0},
        ],
        edges=[
            {"from_node": ROOT,   "to_node": NODE_A, "id": "edge_root_a"},
            {"from_node": ROOT,   "to_node": NODE_B, "id": "edge_root_b"},
            {"from_node": NODE_A, "to_node": NODE_C, "id": "edge_a_c"},
        ],
    )


# ---------------------------------------------------------------------------
# TestTraversePaths
# ---------------------------------------------------------------------------


class TestTraversePaths:
    def test_linear_graph_depth2_returns_two_paths(self, linear_graph):
        """root→A and root→A→B should be returned for max_depth=2."""
        paths = traverse_paths(linear_graph, max_depth=2)
        assert [ROOT, NODE_A] in paths
        assert [ROOT, NODE_A, NODE_B] in paths

    def test_depth_limit_respected(self, linear_graph):
        """max_depth=1 should return only 1-hop paths."""
        paths = traverse_paths(linear_graph, max_depth=1)
        for path in paths:
            assert len(path) <= 2, f"Path {path} exceeds max_depth=1"

    def test_empty_graph_returns_empty(self):
        G = nx.MultiDiGraph()
        G.graph["root_address"] = ""
        assert traverse_paths(G, max_depth=3) == []

    def test_single_node_no_edges_returns_empty(self):
        G = _make_graph(
            nodes=[{"id": ROOT, "address": "0xaaaa000000000000000000000000000000000000", "type": "wallet", "labels": [], "risk_level": "low", "total_in_usd": 0, "total_out_usd": 0}],
            edges=[],
        )
        assert traverse_paths(G, max_depth=3) == []

    def test_branching_graph_returns_all_paths(self, branching_graph):
        paths = traverse_paths(branching_graph, max_depth=3)
        assert [ROOT, NODE_A] in paths
        assert [ROOT, NODE_B] in paths
        assert [ROOT, NODE_A, NODE_C] in paths

    def test_root_not_in_graph_returns_empty(self):
        G = _make_graph(
            nodes=[{"id": NODE_A, "address": "0xaaaa000000000000000000000000000000000001", "type": "wallet", "labels": [], "risk_level": "low", "total_in_usd": 0, "total_out_usd": 0}],
            edges=[],
        )
        # root_address doesn't match NODE_A
        assert traverse_paths(G, max_depth=3) == []

    def test_no_path_longer_than_max_depth(self, branching_graph):
        paths = traverse_paths(branching_graph, max_depth=1)
        for path in paths:
            assert len(path) - 1 <= 1

    def test_trivial_single_node_paths_excluded(self, linear_graph):
        paths = traverse_paths(linear_graph, max_depth=3)
        for path in paths:
            assert len(path) >= 2, "Single-node paths must be excluded"


# ---------------------------------------------------------------------------
# TestResolveEdgeIds
# ---------------------------------------------------------------------------


class TestResolveEdgeIds:
    def test_resolves_known_edge_ids(self, linear_graph):
        path = [ROOT, NODE_A, NODE_B]
        edge_ids = resolve_edge_ids_for_path(linear_graph, path)
        assert edge_ids == ["edge_root_a", "edge_a_b"]

    def test_single_node_path_returns_empty(self, linear_graph):
        assert resolve_edge_ids_for_path(linear_graph, [ROOT]) == []

    def test_empty_path_returns_empty(self, linear_graph):
        assert resolve_edge_ids_for_path(linear_graph, []) == []
