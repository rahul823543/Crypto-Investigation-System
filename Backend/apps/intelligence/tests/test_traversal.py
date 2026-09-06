"""
tests/test_traversal.py
────────────────────────
Unit tests for app/traversal/multi_hop.py (v3 Phase 4).

v3 changes:
  - traverse_paths() returns PathState objects (not list[list[str]])
  - Stopping condition is confidence-decay, not fixed max_depth
  - isTraceableDeadEnd flag on graph nodes prunes traversal
  - MAX_TOTAL_PATHS (was MAX_PATHS) is the exported cap name

Fixtures:
  linear_graph    — root → A → B (3 nodes, 2-hop chain)
  branching_graph — root → A, root → B, A → C (fan-out)
  dead_end_graph  — root → MIXER (isTraceableDeadEnd=True) → C
"""
from __future__ import annotations

import networkx as nx
import pytest

from app.graph.builder import build_graph
from app.schemas.request import AnalysisRequest
from app.traversal.multi_hop import MAX_TOTAL_PATHS, resolve_edge_ids_for_path, traverse_paths


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

ROOT  = "wallet:0xaaaa000000000000000000000000000000000000"
NODE_A = "wallet:0xaaaa000000000000000000000000000000000001"
NODE_B = "wallet:0xaaaa000000000000000000000000000000000002"
NODE_C = "wallet:0xaaaa000000000000000000000000000000000003"
MIXER  = "wallet:0xaaaa000000000000000000000000000000000004"


def _make_graph(nodes: list[dict], edges: list[dict]) -> nx.MultiDiGraph:
    """Build a MultiDiGraph directly for traversal tests."""
    G = nx.MultiDiGraph()
    G.graph["root_address"] = "0xaaaa000000000000000000000000000000000000"
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


def _wallet_node(node_id: str, address: str, **kwargs) -> dict:
    return {"id": node_id, "address": address, "type": "wallet",
            "labels": [], "risk_level": "low", "total_in_usd": 0,
            "total_out_usd": 0, "isTraceableDeadEnd": False, **kwargs}


@pytest.fixture
def linear_graph() -> nx.MultiDiGraph:
    """root → A → B — depth-2 linear chain."""
    return _make_graph(
        nodes=[
            _wallet_node(ROOT,   "0xaaaa000000000000000000000000000000000000"),
            _wallet_node(NODE_A, "0xaaaa000000000000000000000000000000000001"),
            _wallet_node(NODE_B, "0xaaaa000000000000000000000000000000000002"),
        ],
        edges=[
            {"from_node": ROOT,   "to_node": NODE_A, "id": "edge_root_a"},
            {"from_node": NODE_A, "to_node": NODE_B, "id": "edge_a_b"},
        ],
    )


@pytest.fixture
def branching_graph() -> nx.MultiDiGraph:
    """root → A, root → B, A → C — fan-out structure."""
    return _make_graph(
        nodes=[
            _wallet_node(ROOT,   "0xaaaa000000000000000000000000000000000000"),
            _wallet_node(NODE_A, "0xaaaa000000000000000000000000000000000001"),
            _wallet_node(NODE_B, "0xaaaa000000000000000000000000000000000002"),
            {**_wallet_node(NODE_C, "0xaaaa000000000000000000000000000000000003"), "type": "dex"},
        ],
        edges=[
            {"from_node": ROOT,   "to_node": NODE_A, "id": "edge_root_a"},
            {"from_node": ROOT,   "to_node": NODE_B, "id": "edge_root_b"},
            {"from_node": NODE_A, "to_node": NODE_C, "id": "edge_a_c"},
        ],
    )


@pytest.fixture
def dead_end_graph() -> nx.MultiDiGraph:
    """root → MIXER(isTraceableDeadEnd=True) → C.
    Traversal must NOT expand past MIXER even though C is reachable."""
    return _make_graph(
        nodes=[
            _wallet_node(ROOT,  "0xaaaa000000000000000000000000000000000000"),
            {**_wallet_node(MIXER, "0xaaaa000000000000000000000000000000000004"),
             "type": "mixer", "isTraceableDeadEnd": True},
            _wallet_node(NODE_C, "0xaaaa000000000000000000000000000000000003"),
        ],
        edges=[
            {"from_node": ROOT,  "to_node": MIXER,  "id": "edge_root_mixer"},
            {"from_node": MIXER, "to_node": NODE_C,  "id": "edge_mixer_c"},
        ],
    )


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _path_node_lists(paths) -> list[list[str]]:
    """Extract .node_ids from PathState objects for easy comparison."""
    return [ps.node_ids for ps in paths]


# Default v3 traversal params for tests
_V3 = dict(min_confidence=0.15, decay_factor=0.65, hard_ceiling_depth=10, hub_threshold=500)


# ---------------------------------------------------------------------------
# TestTraversePaths
# ---------------------------------------------------------------------------


class TestTraversePaths:
    def test_linear_graph_returns_both_paths(self, linear_graph):
        """root→A and root→A→B should both be returned."""
        paths = _path_node_lists(traverse_paths(linear_graph, **_V3))
        assert [ROOT, NODE_A] in paths
        assert [ROOT, NODE_A, NODE_B] in paths

    def test_empty_graph_returns_empty(self):
        G = nx.MultiDiGraph()
        G.graph["root_address"] = ""
        assert traverse_paths(G, **_V3) == []

    def test_single_node_no_edges_returns_empty(self):
        G = _make_graph(
            nodes=[{"id": ROOT, "address": "0xaaaa000000000000000000000000000000000000", "type": "wallet", "labels": [], "risk_level": "low", "total_in_usd": 0, "total_out_usd": 0}],
            edges=[],
        )
        assert traverse_paths(G, **_V3) == []

    def test_branching_graph_returns_all_paths(self, branching_graph):
        paths = _path_node_lists(traverse_paths(branching_graph, **_V3))
        assert [ROOT, NODE_A] in paths
        assert [ROOT, NODE_B] in paths
        assert [ROOT, NODE_A, NODE_C] in paths

    def test_root_not_in_graph_returns_empty(self):
        G = _make_graph(
            nodes=[{"id": NODE_A, "address": "0xaaaa000000000000000000000000000000000001", "type": "wallet", "labels": [], "risk_level": "low", "total_in_usd": 0, "total_out_usd": 0}],
            edges=[],
        )
        # root_address doesn't match NODE_A
        assert traverse_paths(G, **_V3) == []

    def test_no_path_longer_than_hard_ceiling_depth(self, branching_graph):
        paths = _path_node_lists(traverse_paths(branching_graph, hard_ceiling_depth=1))
        for path in paths:
            assert len(path) - 1 <= 1

    def test_trivial_single_node_paths_excluded(self, linear_graph):
        paths = _path_node_lists(traverse_paths(linear_graph, **_V3))
        for path in paths:
            assert len(path) >= 2, "Single-node paths must be excluded"

    def test_dead_end_node_prunes_expansion(self, dead_end_graph):
        """root → MIXER(dead end) → C: path stops at MIXER and does not expand to C."""
        paths = _path_node_lists(traverse_paths(dead_end_graph, **_V3))
        assert [ROOT, MIXER] in paths
        assert [ROOT, MIXER, NODE_C] not in paths


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
