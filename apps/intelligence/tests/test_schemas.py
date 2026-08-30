"""
tests/test_schemas.py
─────────────────────
Phase 1: Pydantic v2 schema validation tests.

These tests run WITHOUT starting a server — they test the schema layer
in isolation. Fast to run, catches contract drift before any HTTP tests.
"""
from __future__ import annotations

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
        assert req.max_depth == 2

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

    def test_max_depth_boundary_1(self):
        req = AnalysisRequest.model_validate({**MINIMAL_VALID_PAYLOAD, "maxDepth": 1})
        assert req.max_depth == 1

    def test_max_depth_boundary_3(self):
        req = AnalysisRequest.model_validate({**MINIMAL_VALID_PAYLOAD, "maxDepth": 3})
        assert req.max_depth == 3


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

    def test_max_depth_zero_rejected(self):
        payload = {**MINIMAL_VALID_PAYLOAD, "maxDepth": 0}
        with pytest.raises(ValidationError):
            AnalysisRequest.model_validate(payload)

    def test_max_depth_four_rejected(self):
        payload = {**MINIMAL_VALID_PAYLOAD, "maxDepth": 4}
        with pytest.raises(ValidationError):
            AnalysisRequest.model_validate(payload)

    def test_edge_referencing_unknown_from_node(self):
        import copy
        payload = copy.deepcopy(MINIMAL_VALID_PAYLOAD)
        payload["edges"][0]["from"] = "wallet:0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"
        with pytest.raises(ValidationError) as exc_info:
            AnalysisRequest.model_validate(payload)
        assert "unknown from-node" in str(exc_info.value)

    def test_edge_referencing_unknown_to_node(self):
        import copy
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
