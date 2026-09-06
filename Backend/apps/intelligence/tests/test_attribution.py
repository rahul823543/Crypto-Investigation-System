"""
tests/test_attribution.py
──────────────────────────
Unit tests for app/attribution/vasp_attribution.py (v3 Phase 4).
"""
import networkx as nx
import pytest

from app.attribution.vasp_attribution import compute_vasp_attribution
from app.traversal.multi_hop import PathState

ROOT = "wallet:0xroot"
NODE_A = "wallet:0xa"
BINANCE = "wallet:0xbinance"
COINBASE = "wallet:0xcoinbase"
MIXER = "wallet:0xmixer"


def _make_attribution_graph() -> nx.MultiDiGraph:
    G = nx.MultiDiGraph()
    G.add_node(ROOT, address="0xroot", type="wallet", labels=["root"])
    G.add_node(NODE_A, address="0xa", type="wallet", labels=[])
    G.add_node(
        BINANCE,
        address="0xbinance",
        type="vasp",
        labels=["vasp"],
        vaspName="Binance",
        isTraceableDeadEnd=True,
    )
    G.add_node(
        COINBASE,
        address="0xcoinbase",
        type="vasp",
        labels=["vasp"],
        vaspName="Coinbase",
        isTraceableDeadEnd=True,
    )
    G.add_node(
        MIXER,
        address="0xmixer",
        type="mixer",
        labels=["mixer"],
        isTraceableDeadEnd=True,
    )

    # Edges
    G.add_edge(ROOT, NODE_A, id="edge_root_a")
    G.add_edge(NODE_A, BINANCE, id="edge_a_binance")
    G.add_edge(ROOT, COINBASE, id="edge_root_coinbase")
    G.add_edge(ROOT, MIXER, id="edge_root_mixer")
    return G


class TestVaspAttribution:
    def test_empty_paths_returns_none(self):
        G = _make_attribution_graph()
        assert compute_vasp_attribution(G, []) is None

    def test_no_vasp_in_paths_returns_none(self):
        G = _make_attribution_graph()
        path = PathState(node_ids=[ROOT, NODE_A], hop=1, confidence=0.65)
        assert compute_vasp_attribution(G, [path]) is None

    def test_direct_vasp_attributed(self):
        G = _make_attribution_graph()
        # 1-hop path to Coinbase with confidence 0.65
        coinbase_path = PathState(node_ids=[ROOT, COINBASE], hop=1, confidence=0.65)
        attr = compute_vasp_attribution(G, [coinbase_path])

        assert attr is not None
        assert attr.attributed_vasp == "Coinbase"
        assert attr.vasp_node_id == COINBASE
        assert attr.hop_distance == 1
        assert attr.confidence == 0.65
        assert attr.path_node_ids == [ROOT, COINBASE]
        assert attr.path_edge_ids == ["edge_root_coinbase"]

    def test_multi_vasp_highest_confidence_primary(self):
        G = _make_attribution_graph()
        # 1-hop Coinbase has confidence 0.65; 2-hop Binance has confidence 0.42
        coinbase_path = PathState(node_ids=[ROOT, COINBASE], hop=1, confidence=0.65)
        binance_path = PathState(node_ids=[ROOT, NODE_A, BINANCE], hop=2, confidence=0.42)

        attr = compute_vasp_attribution(G, [coinbase_path, binance_path])
        assert attr is not None
        assert attr.attributed_vasp == "Coinbase"
        assert len(attr.secondary_candidates) == 1
        assert attr.secondary_candidates[0]["attributedVasp"] == "Binance"

    def test_mixer_path_yields_none(self):
        G = _make_attribution_graph()
        mixer_path = PathState(node_ids=[ROOT, MIXER], hop=1, confidence=0.65)
        attr = compute_vasp_attribution(G, [mixer_path])
        assert attr is None
