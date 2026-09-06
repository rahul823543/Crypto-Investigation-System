"""
tests/test_priority_queue.py
─────────────────────────────
Unit tests for app/traversal/priority_queue.py (v3 Phase 4).
"""
import networkx as nx
import pytest

from app.traversal.multi_hop import PathState
from app.traversal.priority_queue import (
    get_path_signals,
    rank_paths_by_priority,
    score_path,
)

ROOT = "wallet:0xroot"
NODE_A = "wallet:0xa"
NODE_B = "wallet:0xb"
DEX_NODE = "dex:0xdex"
RISKY_NODE = "wallet:0xrisky"


def _make_test_graph() -> nx.MultiDiGraph:
    G = nx.MultiDiGraph()
    G.add_node(ROOT, address="0xroot", type="wallet", labels=["root"])
    G.add_node(NODE_A, address="0xa", type="wallet", labels=[])
    G.add_node(NODE_B, address="0xb", type="wallet", labels=[])
    G.add_node(DEX_NODE, address="0xdex", type="dex", labels=["dex"])
    G.add_node(RISKY_NODE, address="0xrisky", type="wallet", labels=["sanctioned"])

    # Edges
    G.add_edge(ROOT, NODE_A, id="e1", timestamp_epoch=1000.0)
    G.add_edge(NODE_A, DEX_NODE, id="e2", timestamp_epoch=1100.0)
    G.add_edge(ROOT, RISKY_NODE, id="e3", timestamp_epoch=1050.0)
    G.add_edge(ROOT, NODE_B, id="e4", timestamp_epoch=5000.0)
    return G


class TestPriorityQueue:
    def test_empty_paths_returns_empty(self):
        G = _make_test_graph()
        assert rank_paths_by_priority(G, []) == []

    def test_risky_label_path_scores_higher_than_clean(self):
        G = _make_test_graph()
        clean_path = PathState(node_ids=[ROOT, NODE_B], hop=1, confidence=0.65)
        risky_path = PathState(node_ids=[ROOT, RISKY_NODE], hop=1, confidence=0.65)

        score_clean = score_path(G, clean_path)
        score_risky = score_path(G, risky_path)

        assert score_risky > score_clean
        signals = get_path_signals(G, risky_path)
        assert "touches_risky_label" in signals

    def test_dex_touchpoint_detected_in_signals(self):
        G = _make_test_graph()
        dex_path = PathState(node_ids=[ROOT, NODE_A, DEX_NODE], hop=2, confidence=0.42)
        signals = get_path_signals(G, dex_path)
        assert "dex_or_bridge_touchpoint" in signals

    def test_rank_paths_orders_highest_priority_first(self):
        G = _make_test_graph()
        clean_path = PathState(node_ids=[ROOT, NODE_B], hop=1, confidence=0.1)
        # dex_path has both DEX touchpoint (20) and rapid movement (30) + 0.5*25 = 62.5
        dex_path = PathState(node_ids=[ROOT, NODE_A, DEX_NODE], hop=2, confidence=0.5)
        # risky_path has risky label (35) + 0.9*25 = 57.5
        risky_path = PathState(node_ids=[ROOT, RISKY_NODE], hop=1, confidence=0.9)

        ranked = rank_paths_by_priority(G, [clean_path, dex_path, risky_path])
        # Multi-signal path (DEX + rapid movement = 62.5) ranks highest
        assert ranked[0].node_ids == dex_path.node_ids
        assert ranked[1].node_ids == risky_path.node_ids
        assert ranked[2].node_ids == clean_path.node_ids
