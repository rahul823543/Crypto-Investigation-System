"""
tests/test_phase5_scenarios.py
───────────────────────────────
Phase 5: Comprehensive integration & scenario test suite.

Validates the full v3 forensic triage pipeline against synthetic laundering
scenarios, confidence decay parameter tuning, attribution edge cases,
and fuzzy alias resolution.
"""
from __future__ import annotations

import pytest
import pytest_asyncio

from app.schemas.investigation import AnalysisRequest
from app.api.routes import analyze
from app.traversal.confidence import confidence_at_hop
from app.traversal.fuzzy import find_best_fuzzy_match, is_fuzzy_match

# ---------------------------------------------------------------------------
# 1. Empty Graph Edge Case
# ---------------------------------------------------------------------------


class TestEmptyGraphScenario:
    @pytest.mark.asyncio
    async def test_empty_graph_http_status_and_shape(self, client, fixture_empty_graph):
        """Empty graph must return 200 OK with zero risk score and null attribution."""
        r = await client.post("/v1/analyze", json=fixture_empty_graph)
        assert r.status_code == 200
        body = r.json()
        assert body["caseId"] == fixture_empty_graph["caseId"]
        assert body["riskScore"] == 0
        assert body["riskLevel"] == "low"
        assert body["suspiciousPaths"] == []
        assert body["circularFlows"] == []
        assert body["findings"] == []
        assert body["vaspAttribution"] is None

    def test_empty_graph_pipeline_direct(self, fixture_empty_graph):
        """Direct pipeline execution returns zeroed AnalysisResponse without crashing."""
        req = AnalysisRequest.model_validate(fixture_empty_graph)
        res = analyze(req)
        assert res.risk_score == 0
        assert res.risk_level == "low"
        assert res.vasp_attribution is None


# ---------------------------------------------------------------------------
# 2. Simple Fan-Out & Peeling Relay Scenario
# ---------------------------------------------------------------------------


class TestSimpleFanoutScenario:
    @pytest.mark.asyncio
    async def test_fanout_ranking_and_score(self, client, fixture_simple_fanout):
        """
        Fan-out disperses funds to 5 wallets; one relays downstream rapidly.
        Proves the priority queue orders behavioral suspicion over raw value.
        """
        r = await client.post("/v1/analyze", json=fixture_simple_fanout)
        assert r.status_code == 200
        body = r.json()

        assert body["riskScore"] >= 50
        assert body["riskLevel"] in {"high", "critical"}

        paths = body["suspiciousPaths"]
        assert len(paths) >= 5

        # Top ranked path must be the rapid relay with fan-out
        top_path = paths[0]
        assert top_path["rank"] == 1
        assert "fan_out_relay" in top_path["reasonCodes"]
        assert "rapid_movement" in top_path["reasonCodes"]
        assert top_path["score"] == 75

        # Basic finding from fastify was incorporated (+5 points)
        assert any(f["title"] == "Suspicious path detected (rank 1)" for f in body["findings"])


# ---------------------------------------------------------------------------
# 3. Circular Flow & Mixer Dead-End Scenario
# ---------------------------------------------------------------------------


class TestCircularFlowScenario:
    @pytest.mark.asyncio
    async def test_cycle_detection_and_mixer_dead_end(self, client, fixture_circular_flow):
        """
        Circular flow loops funds root -> relay -> DEX -> root, while also touching a mixer.
        - Circular flow is detected.
        - Mixer node stops traversal expansion.
        - Attribution returns null (no VASP reached).
        - Severity is critical.
        """
        r = await client.post("/v1/analyze", json=fixture_circular_flow)
        assert r.status_code == 200
        body = r.json()

        assert body["riskScore"] >= 75
        assert body["riskLevel"] == "critical"

        # Circular flow cycle detected
        assert len(body["circularFlows"]) == 1
        cycle = body["circularFlows"][0]
        assert cycle["cycleLength"] == 3
        assert fixture_circular_flow["rootAddress"] in str(cycle["nodeIds"])

        # Check path signals received circular_return (+35)
        top_path = body["suspiciousPaths"][0]
        assert "circular_return" in top_path["reasonCodes"]

        # VASP attribution must be null (stopped at mixer / wash loop)
        assert body["vaspAttribution"] is None


# ---------------------------------------------------------------------------
# 4. Multi-Hop DEX + Bridge + VASP Attribution Scenario
# ---------------------------------------------------------------------------


class TestDexBridgeHopScenario:
    @pytest.mark.asyncio
    async def test_vasp_attribution_resolved(self, client, fixture_dex_bridge_hop):
        """
        Multi-hop path: Root -> QuickSwap DEX -> Polygon Bridge -> Mule -> Binance VASP.
        - Traverses 4 hops to reach labeled VASP node.
        - Surviving confidence at hop 4: 1.0 * (0.65^4) = 0.1785 >= 0.15.
        - Correctly attributes Binance deposit.
        """
        r = await client.post("/v1/analyze", json=fixture_dex_bridge_hop)
        assert r.status_code == 200
        body = r.json()

        attr = body["vaspAttribution"]
        assert attr is not None
        assert "binance" in attr["attributedVasp"].lower()
        assert attr["hopDistance"] == 4
        expected_conf = confidence_at_hop(1.0, 0.65, 4)
        assert pytest.approx(attr["confidence"], abs=1e-4) == expected_conf
        assert len(attr["pathNodeIds"]) == 5
        assert len(attr["pathEdgeIds"]) == 4

        # Risk level should reflect dex + bridge touchpoints
        top_path = body["suspiciousPaths"][0]
        assert "dex_touchpoint" in top_path["reasonCodes"]
        assert "bridge_touchpoint" in top_path["reasonCodes"]


# ---------------------------------------------------------------------------
# 5. Parameter Tuning & Confidence Decay Edge Cases
# ---------------------------------------------------------------------------


class TestParameterTuningEdgeCases:
    def test_min_confidence_pruning(self, fixture_dex_bridge_hop):
        """
        If minConfidence is raised to 0.20 (above the 4-hop confidence 0.1785),
        traversal must prune the path before reaching the VASP, yielding null attribution.
        """
        payload = dict(fixture_dex_bridge_hop)
        payload["minConfidence"] = 0.20  # higher than 0.1785
        req = AnalysisRequest.model_validate(payload)
        res = analyze(req)
        assert res.vasp_attribution is None

    def test_decay_factor_acceleration(self, fixture_dex_bridge_hop):
        """
        If decayFactor is reduced to 0.50:
        Hop 4 confidence = 1.0 * (0.5^4) = 0.0625 < 0.15, pruning before VASP.
        """
        payload = dict(fixture_dex_bridge_hop)
        payload["decayFactor"] = 0.50
        req = AnalysisRequest.model_validate(payload)
        res = analyze(req)
        assert res.vasp_attribution is None

    def test_hard_ceiling_depth_cutoff(self, fixture_dex_bridge_hop):
        """
        If hardCeilingDepth is set to 3:
        Path cannot expand to the 4th hop (VASP), so attribution must be null.
        """
        payload = dict(fixture_dex_bridge_hop)
        payload["hardCeilingDepth"] = 3
        req = AnalysisRequest.model_validate(payload)
        res = analyze(req)
        assert res.vasp_attribution is None

    def test_hub_threshold_pruning(self, fixture_simple_fanout):
        """
        If hubThreshold is set to 1:
        Intermediary node wallet:0xbbbb1111... has out-degree 1 >= 1, triggering
        hub stopping condition and preventing expansion to wallet:0xcccc2222...
        """
        payload = dict(fixture_simple_fanout)
        payload["hubThreshold"] = 1
        req = AnalysisRequest.model_validate(payload)
        res = analyze(req)
        # Traversal stopped at the intermediary hub, so relay path (hop 2) was pruned
        assert len(res.suspicious_paths) == 5
        assert not any("fan_out_relay" in p.reason_codes for p in res.suspicious_paths)


# ---------------------------------------------------------------------------
# 6. Fuzzy Alias Resolution & Culprit Evasion
# ---------------------------------------------------------------------------


class TestFuzzyMatching:
    def test_exact_and_case_insensitive_match(self):
        assert is_fuzzy_match("Binance_Hot_1", "binance_hot_1") is True
        assert is_fuzzy_match("Tornado.Cash", "Tornado.Cash") is True

    def test_minor_punctuation_and_space_variation(self):
        assert is_fuzzy_match("Binance_Hot_1", "Binance Hot 1", threshold=0.80) is True
        assert is_fuzzy_match("Tornado.Cash: 100 ETH", "Tornado Cash 100 ETH", threshold=0.85) is True

    def test_different_entities_do_not_match(self):
        assert is_fuzzy_match("Binance_Hot_1", "Uniswap_Router_V3", threshold=0.50) is False
        assert is_fuzzy_match("Tornado.Cash", "Coinbase_Deposit", threshold=0.50) is False

    def test_find_best_match_from_known_aliases(self):
        known = [
            "Binance: Hot Wallet 1",
            "Coinbase: Prime Custody",
            "Kraken: Exchange Wallet",
            "Tornado.Cash: 10 ETH",
        ]
        match = find_best_fuzzy_match("binance hot wallet 1", known, threshold=0.80)
        assert match == "Binance: Hot Wallet 1"

        match = find_best_fuzzy_match("tornado cash 10 eth", known, threshold=0.80)
        assert match == "Tornado.Cash: 10 ETH"

        none_match = find_best_fuzzy_match("unknown malicious contract", known, threshold=0.80)
        assert none_match is None
