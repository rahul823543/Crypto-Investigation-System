"""
tests/test_schemas.py
─────────────────────
Phase 1: Pydantic v2 schema validation tests.

These tests run WITHOUT starting a server — they test the schema layer
in isolation. Fast to run, catches contract drift before any HTTP tests.
"""
from __future__ import annotations

import copy

import pytest
from pydantic import ValidationError

from app.schemas.request import AnalysisRequest
from app.schemas.response import AnalysisMetadata, AnalysisResponse
from tests.conftest import MINIMAL_VALID_PAYLOAD


# ---------------------------------------------------------------------------
# AnalysisRequest — happy paths
# ---------------------------------------------------------------------------


class TestAnalysisRequestValid:
    def test_parses_minimal_valid_payload(self):
        req = AnalysisRequest.model_validate(MINIMAL_VALID_PAYLOAD)
        assert req.case_id == "case_phase1_test"
        assert req.min_confidence == 0.15
        assert req.decay_factor == 0.65
        assert req.hard_ceiling_depth == 10
        assert req.hub_threshold == 500

    def test_root_address_normalised_to_lowercase(self):
        payload = {**MINIMAL_VALID_PAYLOAD, "rootAddress": "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"}
        req = AnalysisRequest.model_validate(payload)
        assert req.root_address == "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

    def test_empty_transactions_and_findings_allowed(self):
        payload = {**MINIMAL_VALID_PAYLOAD, "transactions": [], "basicFindings": []}
        req = AnalysisRequest.model_validate(payload)
        assert req.transactions == []
        assert req.basic_findings == []

    def test_empty_nodes_and_edges_allowed(self):
        payload = {
            **MINIMAL_VALID_PAYLOAD,
            "nodes": [],
            "edges": [],
            "transactions": [],
        }
        req = AnalysisRequest.model_validate(payload)
        assert req.nodes == []
        assert req.edges == []

    def test_confidence_boundaries(self):
        req = AnalysisRequest.model_validate({**MINIMAL_VALID_PAYLOAD, "minConfidence": 0.0, "decayFactor": 1.0})
        assert req.min_confidence == 0.0
        assert req.decay_factor == 1.0

    def test_hard_ceiling_boundaries(self):
        req1 = AnalysisRequest.model_validate({**MINIMAL_VALID_PAYLOAD, "hardCeilingDepth": 1})
        req15 = AnalysisRequest.model_validate({**MINIMAL_VALID_PAYLOAD, "hardCeilingDepth": 15})
        assert req1.hard_ceiling_depth == 1
        assert req15.hard_ceiling_depth == 15


# ---------------------------------------------------------------------------
# AnalysisRequest — validation failures (should all raise ValidationError)
# ---------------------------------------------------------------------------


class TestAnalysisRequestInvalid:
    def test_invalid_evm_address_too_short(self):
        payload = {**MINIMAL_VALID_PAYLOAD, "rootAddress": "0x1234"}
        with pytest.raises(ValidationError) as exc_info:
            AnalysisRequest.model_validate(payload)
        errors = exc_info.value.errors()
        assert any("rootAddress" in str(e) or "root_address" in str(e) for e in errors)

    def test_invalid_evm_address_no_0x_prefix(self):
        payload = {**MINIMAL_VALID_PAYLOAD, "rootAddress": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}
        with pytest.raises(ValidationError):
            AnalysisRequest.model_validate(payload)

    def test_invalid_evm_address_non_hex(self):
        payload = {**MINIMAL_VALID_PAYLOAD, "rootAddress": "0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG"}
        with pytest.raises(ValidationError):
            AnalysisRequest.model_validate(payload)

    def test_min_confidence_negative_rejected(self):
        payload = {**MINIMAL_VALID_PAYLOAD, "minConfidence": -0.1}
        with pytest.raises(ValidationError):
            AnalysisRequest.model_validate(payload)

    def test_min_confidence_greater_than_one_rejected(self):
        payload = {**MINIMAL_VALID_PAYLOAD, "minConfidence": 1.1}
        with pytest.raises(ValidationError):
            AnalysisRequest.model_validate(payload)

    def test_hard_ceiling_zero_rejected(self):
        payload = {**MINIMAL_VALID_PAYLOAD, "hardCeilingDepth": 0}
        with pytest.raises(ValidationError):
            AnalysisRequest.model_validate(payload)

    def test_hard_ceiling_sixteen_rejected(self):
        payload = {**MINIMAL_VALID_PAYLOAD, "hardCeilingDepth": 16}
        with pytest.raises(ValidationError):
            AnalysisRequest.model_validate(payload)

    def test_edge_referencing_unknown_from_node(self):
        payload = copy.deepcopy(MINIMAL_VALID_PAYLOAD)
        payload["edges"][0]["from"] = "wallet:0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"
        with pytest.raises(ValidationError) as exc_info:
            AnalysisRequest.model_validate(payload)
        assert "unknown from-node" in str(exc_info.value)

    def test_edge_referencing_unknown_to_node(self):
        payload = copy.deepcopy(MINIMAL_VALID_PAYLOAD)
        payload["edges"][0]["to"] = "wallet:0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"
        with pytest.raises(ValidationError) as exc_info:
            AnalysisRequest.model_validate(payload)
        assert "unknown to-node" in str(exc_info.value)

    def test_missing_case_id(self):
        payload = {k: v for k, v in MINIMAL_VALID_PAYLOAD.items() if k != "caseId"}
        with pytest.raises(ValidationError):
            AnalysisRequest.model_validate(payload)

    def test_missing_root_address(self):
        payload = {k: v for k, v in MINIMAL_VALID_PAYLOAD.items() if k != "rootAddress"}
        with pytest.raises(ValidationError):
            AnalysisRequest.model_validate(payload)


# ---------------------------------------------------------------------------
# AnalysisResponse — schema sanity
# ---------------------------------------------------------------------------


class TestAnalysisResponseSchema:
    def test_risk_score_rejects_negative(self):
        with pytest.raises(ValidationError):
            AnalysisResponse(
                analysisId="x",
                caseId="c",
                riskScore=-1,
                riskLevel="low",
                analysisMetadata=AnalysisMetadata(engineVersion="0.1.0", runtimeMs=0),
            )

    def test_risk_score_rejects_above_100(self):
        with pytest.raises(ValidationError):
            AnalysisResponse(
                analysisId="x",
                caseId="c",
                riskScore=101,
                riskLevel="low",
                analysisMetadata=AnalysisMetadata(engineVersion="0.1.0", runtimeMs=0),
            )

    def test_valid_response_round_trips_to_json(self):
        resp = AnalysisResponse(
            analysisId="analysis_case_001_req_001",
            caseId="case_001",
            riskScore=42,
            riskLevel="medium",
            findings=[],
            suspiciousPaths=[],
            circularFlows=[],
            analysisMetadata=AnalysisMetadata(engineVersion="0.1.0", runtimeMs=12),
        )
        data = resp.model_dump(by_alias=True)
        assert data["riskScore"] == 42
        assert data["riskLevel"] == "medium"
        assert data["analysisMetadata"]["engineVersion"] == "0.1.0"
        assert "analysisId" in data
        assert "caseId" in data

    def test_risk_level_invalid_value_rejected(self):
        with pytest.raises(ValidationError):
            AnalysisResponse(
                analysisId="x",
                caseId="c",
                riskScore=50,
                riskLevel="extreme",  # not in the enum
                analysisMetadata=AnalysisMetadata(engineVersion="0.1.0", runtimeMs=0),
            )

    def test_response_with_vasp_attribution_round_trips(self):
        from app.schemas.response import VaspAttribution

        resp = AnalysisResponse(
            analysisId="analysis_case_001_req_001",
            caseId="case_001",
            riskScore=42,
            riskLevel="medium",
            findings=[],
            suspiciousPaths=[],
            circularFlows=[],
            vaspAttribution=VaspAttribution(
                attributedVasp="Binance",
                vaspNodeId="wallet:0x999",
                hopDistance=2,
                confidence=0.74,
                pathNodeIds=["wallet:0x1", "wallet:0x2", "wallet:0x999"],
                pathEdgeIds=["edge:0x1", "edge:0x2"],
                basis="2 hops to Binance",
                secondaryCandidates=[],
            ),
            analysisMetadata=AnalysisMetadata(engineVersion="0.1.0", runtimeMs=12),
        )
        data = resp.model_dump(by_alias=True)
        assert data["vaspAttribution"] is not None
        assert data["vaspAttribution"]["attributedVasp"] == "Binance"
        assert data["vaspAttribution"]["hopDistance"] == 2

