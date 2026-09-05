"""
tests/test_detection.py
────────────────────────
Unit tests for:
  - app/detection/circular_flows.py
  - app/detection/suspicious_paths.py

Fixtures are built directly as MultiDiGraphs to keep tests independent
of the AnalysisRequest parsing layer.
"""
from __future__ import annotations

import networkx as nx
import pytest

from app.detection.circular_flows import detect_circular_flows
from app.detection.suspicious_paths import (
    HIGH_VALUE_THRESHOLD_USD,
    RAPID_MOVEMENT_WINDOW_SECONDS,
    detect_suspicious_paths,
)
from app.traversal.multi_hop import traverse_paths

# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

ROOT = "wallet:0xaaaa000000000000000000000000000000000000"
NODE_A = "wallet:0xaaaa000000000000000000000000000000000001"
NODE_B = "wallet:0xaaaa000000000000000000000000000000000002"
NODE_C = "dex:0xaaaa000000000000000000000000000000000003"
MIXER = "mixer:0xaaaa000000000000000000000000000000000004"
BRIDGE = "bridge:0xaaaa000000000000000000000000000000000005"


def _node(nid: str, ntype: str = "wallet", labels: list | None = None) -> dict:
    addr = nid.split(":", 1)[1]
    return {
        "id": nid,
        "address": addr,
        "type": ntype,
        "labels": labels or [],
        "risk_level": "low",
        "total_in_usd": 0,
        "total_out_usd": 0,
    }


def _build(nodes: list[dict], edges: list[dict], root_addr: str = "0xaaaa000000000000000000000000000000000000") -> nx.MultiDiGraph:
    G = nx.MultiDiGraph()
    G.graph["root_address"] = root_addr
    for n in nodes:
        G.add_node(n["id"], **{k: v for k, v in n.items() if k != "id"})
    for e in edges:
        G.add_edge(
            e["from_node"], e["to_node"],
            id=e.get("id", "edge_x"),
            amount_usd=e.get("amount_usd", 100.0),
            timestamp=e.get("timestamp", "2026-01-01T10:00:00Z"),
            hop_depth=e.get("hop_depth", 1),
            risk_level="low",
        )
    return G


# ---------------------------------------------------------------------------
# TestCircularFlows
# ---------------------------------------------------------------------------


class TestCircularFlows:
    def test_no_cycles_returns_empty(self):
        G = _build(
            nodes=[_node(ROOT), _node(NODE_A), _node(NODE_B)],
            edges=[
                {"from_node": ROOT, "to_node": NODE_A},
                {"from_node": NODE_A, "to_node": NODE_B},
            ],
        )
        assert detect_circular_flows(G) == []

    def test_detects_2_node_cycle(self):
        """ROOT → A → ROOT forms a 2-node cycle."""
        G = _build(
            nodes=[_node(ROOT), _node(NODE_A)],
            edges=[
                {"from_node": ROOT,   "to_node": NODE_A, "id": "edge_ra"},
                {"from_node": NODE_A, "to_node": ROOT,   "id": "edge_ar"},
            ],
        )
        flows = detect_circular_flows(G)
        assert len(flows) == 1
        assert flows[0].cycle_length == 2

    def test_detects_3_node_cycle(self):
        """ROOT → A → B → ROOT forms a 3-node cycle."""
        G = _build(
            nodes=[_node(ROOT), _node(NODE_A), _node(NODE_B)],
            edges=[
                {"from_node": ROOT,   "to_node": NODE_A, "id": "e1"},
                {"from_node": NODE_A, "to_node": NODE_B, "id": "e2"},
                {"from_node": NODE_B, "to_node": ROOT,   "id": "e3"},
            ],
        )
        flows = detect_circular_flows(G)
        assert len(flows) == 1
        assert flows[0].cycle_length == 3

    def test_cycle_node_ids_are_in_graph(self):
        G = _build(
            nodes=[_node(ROOT), _node(NODE_A)],
            edges=[
                {"from_node": ROOT,   "to_node": NODE_A, "id": "e1"},
                {"from_node": NODE_A, "to_node": ROOT,   "id": "e2"},
            ],
        )
        flow = detect_circular_flows(G)[0]
        for nid in flow.node_ids:
            assert G.has_node(nid)

    def test_empty_graph_returns_empty(self):
        G = nx.MultiDiGraph()
        assert detect_circular_flows(G) == []

    def test_cycle_ids_are_unique(self):
        G = _build(
            nodes=[_node(ROOT), _node(NODE_A), _node(NODE_B)],
            edges=[
                {"from_node": ROOT,   "to_node": NODE_A, "id": "e1"},
                {"from_node": NODE_A, "to_node": ROOT,   "id": "e2"},
                {"from_node": ROOT,   "to_node": NODE_B, "id": "e3"},
                {"from_node": NODE_B, "to_node": ROOT,   "id": "e4"},
            ],
        )
        flows = detect_circular_flows(G)
        ids = [f.id for f in flows]
        assert len(ids) == len(set(ids))

    def test_summary_is_non_empty_string(self):
        G = _build(
            nodes=[_node(ROOT), _node(NODE_A)],
            edges=[
                {"from_node": ROOT,   "to_node": NODE_A},
                {"from_node": NODE_A, "to_node": ROOT},
            ],
        )
        flow = detect_circular_flows(G)[0]
        assert isinstance(flow.summary, str) and len(flow.summary) > 0


# ---------------------------------------------------------------------------
# TestSuspiciousPaths
# ---------------------------------------------------------------------------


class TestSuspiciousPaths:
    def _paths_for(self, G: nx.MultiDiGraph, depth: int = 3) -> list[list[str]]:
        return traverse_paths(G, max_depth=depth)

    # -- clean path fires no signals

    def test_clean_path_not_flagged(self):
        G = _build(
            nodes=[_node(ROOT), _node(NODE_A)],
            edges=[{"from_node": ROOT, "to_node": NODE_A, "amount_usd": 10.0,
                    "timestamp": "2026-01-01T10:00:00Z"}],
        )
        paths = self._paths_for(G)
        result = detect_suspicious_paths(G, paths)
        assert result == []

    # -- rapid_movement signal

    def test_rapid_movement_detected(self):
        """Two edges both at 10:00:00 — span = 0s < 600s."""
        G = _build(
            nodes=[_node(ROOT), _node(NODE_A), _node(NODE_B)],
            edges=[
                {"from_node": ROOT,   "to_node": NODE_A,
                 "timestamp": "2026-01-01T10:00:00Z", "amount_usd": 10.0},
                {"from_node": NODE_A, "to_node": NODE_B,
                 "timestamp": "2026-01-01T10:00:00Z", "amount_usd": 10.0},
            ],
        )
        paths = self._paths_for(G)
        result = detect_suspicious_paths(G, paths)
        codes = {code for p in result for code in p.reason_codes}
        assert "rapid_movement" in codes

    def test_slow_movement_not_flagged_as_rapid(self):
        """Edges 2 hours apart — no rapid_movement signal."""
        G = _build(
            nodes=[_node(ROOT), _node(NODE_A), _node(NODE_B)],
            edges=[
                {"from_node": ROOT,   "to_node": NODE_A,
                 "timestamp": "2026-01-01T08:00:00Z", "amount_usd": 10.0},
                {"from_node": NODE_A, "to_node": NODE_B,
                 "timestamp": "2026-01-01T10:00:00Z", "amount_usd": 10.0},
            ],
        )
        paths = self._paths_for(G)
        result = detect_suspicious_paths(G, paths)
        codes = {code for p in result for code in p.reason_codes}
        assert "rapid_movement" not in codes

    # -- dex_touchpoint signal

    def test_dex_touchpoint_detected(self):
        G = _build(
            nodes=[_node(ROOT), _node(NODE_C, ntype="dex")],
            edges=[{"from_node": ROOT, "to_node": NODE_C, "amount_usd": 10.0}],
        )
        paths = self._paths_for(G)
        result = detect_suspicious_paths(G, paths)
        codes = {code for p in result for code in p.reason_codes}
        assert "dex_touchpoint" in codes

    # -- bridge_touchpoint signal

    def test_bridge_touchpoint_detected(self):
        G = _build(
            nodes=[_node(ROOT), _node(BRIDGE, ntype="bridge")],
            edges=[{"from_node": ROOT, "to_node": BRIDGE, "amount_usd": 10.0}],
        )
        result = detect_suspicious_paths(G, self._paths_for(G))
        codes = {c for p in result for c in p.reason_codes}
        assert "bridge_touchpoint" in codes

    # -- mixer_touchpoint signal

    def test_mixer_touchpoint_detected(self):
        G = _build(
            nodes=[_node(ROOT), _node(MIXER, ntype="mixer")],
            edges=[{"from_node": ROOT, "to_node": MIXER, "amount_usd": 10.0}],
        )
        result = detect_suspicious_paths(G, self._paths_for(G))
        codes = {c for p in result for c in p.reason_codes}
        assert "mixer_touchpoint" in codes

    # -- risky_label signal

    def test_risky_label_detected(self):
        G = _build(
            nodes=[_node(ROOT), _node(NODE_A, labels=["risky"])],
            edges=[{"from_node": ROOT, "to_node": NODE_A, "amount_usd": 10.0}],
        )
        result = detect_suspicious_paths(G, self._paths_for(G))
        codes = {c for p in result for c in p.reason_codes}
        assert "risky_label" in codes

    # -- high_value signal

    def test_high_value_detected(self):
        G = _build(
            nodes=[_node(ROOT), _node(NODE_A)],
            edges=[{"from_node": ROOT, "to_node": NODE_A,
                    "amount_usd": HIGH_VALUE_THRESHOLD_USD + 1}],
        )
        result = detect_suspicious_paths(G, self._paths_for(G))
        codes = {c for p in result for c in p.reason_codes}
        assert "high_value" in codes

    def test_just_below_high_value_not_flagged(self):
        G = _build(
            nodes=[_node(ROOT), _node(NODE_A)],
            edges=[{"from_node": ROOT, "to_node": NODE_A,
                    "amount_usd": HIGH_VALUE_THRESHOLD_USD - 1}],
        )
        result = detect_suspicious_paths(G, self._paths_for(G))
        codes = {c for p in result for c in p.reason_codes}
        assert "high_value" not in codes

    # -- structure checks

    def test_path_node_ids_are_subset_of_graph(self):
        G = _build(
            nodes=[_node(ROOT), _node(MIXER, ntype="mixer")],
            edges=[{"from_node": ROOT, "to_node": MIXER, "amount_usd": 10.0}],
        )
        result = detect_suspicious_paths(G, self._paths_for(G))
        for sp in result:
            for nid in sp.node_ids:
                assert G.has_node(nid), f"Node {nid} not in graph"

    def test_path_ids_are_unique(self):
        G = _build(
            nodes=[_node(ROOT), _node(MIXER, ntype="mixer"),
                   _node(BRIDGE, ntype="bridge")],
            edges=[
                {"from_node": ROOT,  "to_node": MIXER},
                {"from_node": MIXER, "to_node": BRIDGE},
            ],
        )
        paths = self._paths_for(G)
        result = detect_suspicious_paths(G, paths)
        ids = [p.id for p in result]
        assert len(ids) == len(set(ids))

    def test_summary_is_non_empty_string(self):
        G = _build(
            nodes=[_node(ROOT), _node(MIXER, ntype="mixer")],
            edges=[{"from_node": ROOT, "to_node": MIXER}],
        )
        result = detect_suspicious_paths(G, self._paths_for(G))
        assert result
        assert isinstance(result[0].summary, str) and len(result[0].summary) > 0

    # -- fan_out_relay signal

    def test_fan_out_relay_detected(self):
        """Root fans out to 3 nodes; A relays to B (len 3 path) -> fan_out_relay."""
        G = _build(
            nodes=[_node(ROOT), _node(NODE_A), _node(NODE_B), _node(NODE_C)],
            edges=[
                {"from_node": ROOT, "to_node": NODE_A, "amount_usd": 100.0},
                {"from_node": ROOT, "to_node": NODE_B, "amount_usd": 100.0},
                {"from_node": ROOT, "to_node": NODE_C, "amount_usd": 100.0},
                {"from_node": NODE_A, "to_node": NODE_B, "amount_usd": 80.0},
            ],
        )
        paths = self._paths_for(G)
        result = detect_suspicious_paths(G, paths)
        codes = {c for p in result for c in p.reason_codes}
        assert "fan_out_relay" in codes

    # -- ofac label

    def test_ofac_label_detected(self):
        G = _build(
            nodes=[_node(ROOT), _node(NODE_A, labels=["ofac"])],
            edges=[{"from_node": ROOT, "to_node": NODE_A, "amount_usd": 10.0}],
        )
        result = detect_suspicious_paths(G, self._paths_for(G))
        codes = {c for p in result for c in p.reason_codes}
        assert "risky_label" in codes

    # -- circular_return integration

    def test_circular_return_signal_attached_when_flow_overlaps(self):
        from app.schemas.response import CircularFlow
        G = _build(
            nodes=[_node(ROOT), _node(NODE_A), _node(NODE_B)],
            edges=[
                {"from_node": ROOT, "to_node": NODE_A},
                {"from_node": NODE_A, "to_node": NODE_B},
            ],
        )
        cycle = CircularFlow(
            id="cycle_001",
            nodeIds=[NODE_A, NODE_B],
            edgeIds=["edge_ab"],
            cycleLength=2,
            summary="test cycle",
        )
        paths = self._paths_for(G)
        result = detect_suspicious_paths(G, paths, circular_flows=[cycle])
        codes = {c for p in result for c in p.reason_codes}
        assert "circular_return" in codes
