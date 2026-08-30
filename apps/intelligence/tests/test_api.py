"""
tests/test_api.py
─────────────────
Phase 1: Full-stack HTTP endpoint tests using the in-process ASGI client.

These tests validate the live HTTP layer — headers, status codes,
JSON shape, and the Fastify-contract guarantees — without starting a real
server or touching a database.
"""
from __future__ import annotations

import copy

import pytest

pytestmark = pytest.mark.asyncio


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------


class TestHealthEndpoint:
    async def test_returns_200(self, client):
        r = await client.get("/health")
        assert r.status_code == 200

    async def test_returns_engine_version(self, client):
        r = await client.get("/health")
        body = r.json()
        assert "engineVersion" in body
        assert body["engineVersion"] != ""

    async def test_returns_ok_status(self, client):
        r = await client.get("/health")
        assert r.json()["status"] == "ok"

    async def test_returns_service_name(self, client):
        r = await client.get("/health")
        assert r.json()["service"] == "python-intelligence"


# ---------------------------------------------------------------------------
# POST /v1/analyze — happy paths
# ---------------------------------------------------------------------------


class TestAnalyzeEndpointValid:
    async def test_returns_200(self, client, minimal_valid_payload):
        r = await client.post("/v1/analyze", json=minimal_valid_payload)
        assert r.status_code == 200

    async def test_case_id_echoed(self, client, minimal_valid_payload):
        r = await client.post("/v1/analyze", json=minimal_valid_payload)
        assert r.json()["caseId"] == minimal_valid_payload["caseId"]

    async def test_risk_score_in_valid_range(self, client, minimal_valid_payload):
        r = await client.post("/v1/analyze", json=minimal_valid_payload)
        score = r.json()["riskScore"]
        assert 0 <= score <= 100

    async def test_risk_level_is_valid_enum(self, client, minimal_valid_payload):
        r = await client.post("/v1/analyze", json=minimal_valid_payload)
        level = r.json()["riskLevel"]
        assert level in {"low", "medium", "high", "critical"}

    async def test_analysis_id_contains_case_id(self, client, minimal_valid_payload):
        r = await client.post("/v1/analyze", json=minimal_valid_payload)
        assert minimal_valid_payload["caseId"] in r.json()["analysisId"]

    async def test_engine_version_present(self, client, minimal_valid_payload):
        r = await client.post("/v1/analyze", json=minimal_valid_payload)
        metadata = r.json()["analysisMetadata"]
        assert "engineVersion" in metadata
        assert metadata["engineVersion"] != ""

    async def test_runtime_ms_present_and_non_negative(self, client, minimal_valid_payload):
        r = await client.post("/v1/analyze", json=minimal_valid_payload)
        runtime_ms = r.json()["analysisMetadata"]["runtimeMs"]
        assert isinstance(runtime_ms, int)
        assert runtime_ms >= 0

    async def test_response_has_all_required_top_level_keys(self, client, minimal_valid_payload):
        r = await client.post("/v1/analyze", json=minimal_valid_payload)
        body = r.json()
        required_keys = {
            "analysisId",
            "caseId",
            "riskScore",
            "riskLevel",
            "findings",
            "suspiciousPaths",
            "circularFlows",
            "analysisMetadata",
        }
        assert required_keys.issubset(body.keys())

    async def test_findings_is_a_list(self, client, minimal_valid_payload):
        r = await client.post("/v1/analyze", json=minimal_valid_payload)
        assert isinstance(r.json()["findings"], list)

    async def test_suspicious_paths_is_a_list(self, client, minimal_valid_payload):
        r = await client.post("/v1/analyze", json=minimal_valid_payload)
        assert isinstance(r.json()["suspiciousPaths"], list)

    async def test_circular_flows_is_a_list(self, client, minimal_valid_payload):
        r = await client.post("/v1/analyze", json=minimal_valid_payload)
        assert isinstance(r.json()["circularFlows"], list)

    async def test_empty_graph_payload_accepted(self, client, minimal_valid_payload):
        """An empty graph (no nodes, no edges) must be accepted, not rejected."""
        payload = copy.deepcopy(minimal_valid_payload)
        payload["nodes"] = []
        payload["edges"] = []
        payload["transactions"] = []
        r = await client.post("/v1/analyze", json=payload)
        assert r.status_code == 200

    async def test_deterministic_response(self, client, minimal_valid_payload):
        """Same input must produce same riskScore and riskLevel (Phase 1 mock is hardcoded)."""
        r1 = await client.post("/v1/analyze", json=minimal_valid_payload)
        r2 = await client.post("/v1/analyze", json=minimal_valid_payload)
        b1, b2 = r1.json(), r2.json()
        assert b1["riskScore"] == b2["riskScore"]
        assert b1["riskLevel"] == b2["riskLevel"]

    async def test_max_depth_1_accepted(self, client, minimal_valid_payload):
        payload = {**minimal_valid_payload, "maxDepth": 1}
        r = await client.post("/v1/analyze", json=payload)
        assert r.status_code == 200

    async def test_max_depth_3_accepted(self, client, minimal_valid_payload):
        payload = {**minimal_valid_payload, "maxDepth": 3}
        r = await client.post("/v1/analyze", json=payload)
        assert r.status_code == 200


# ---------------------------------------------------------------------------
# POST /v1/analyze — validation failures → 422 Unprocessable Entity
# ---------------------------------------------------------------------------


class TestAnalyzeEndpointInvalid:
    async def test_invalid_evm_address_returns_422(self, client, minimal_valid_payload):
        payload = {**minimal_valid_payload, "rootAddress": "not-an-address"}
        r = await client.post("/v1/analyze", json=payload)
        assert r.status_code == 422

    async def test_0x_prefix_only_returns_422(self, client, minimal_valid_payload):
        payload = {**minimal_valid_payload, "rootAddress": "0x"}
        r = await client.post("/v1/analyze", json=payload)
        assert r.status_code == 422

    async def test_max_depth_zero_returns_422(self, client, minimal_valid_payload):
        payload = {**minimal_valid_payload, "maxDepth": 0}
        r = await client.post("/v1/analyze", json=payload)
        assert r.status_code == 422

    async def test_max_depth_four_returns_422(self, client, minimal_valid_payload):
        payload = {**minimal_valid_payload, "maxDepth": 4}
        r = await client.post("/v1/analyze", json=payload)
        assert r.status_code == 422

    async def test_edge_unknown_from_node_returns_422(self, client, minimal_valid_payload):
        payload = copy.deepcopy(minimal_valid_payload)
        payload["edges"][0]["from"] = "wallet:0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"
        r = await client.post("/v1/analyze", json=payload)
        assert r.status_code == 422

    async def test_edge_unknown_to_node_returns_422(self, client, minimal_valid_payload):
        payload = copy.deepcopy(minimal_valid_payload)
        payload["edges"][0]["to"] = "wallet:0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"
        r = await client.post("/v1/analyze", json=payload)
        assert r.status_code == 422

    async def test_missing_case_id_returns_422(self, client, minimal_valid_payload):
        payload = {k: v for k, v in minimal_valid_payload.items() if k != "caseId"}
        r = await client.post("/v1/analyze", json=payload)
        assert r.status_code == 422

    async def test_missing_root_address_returns_422(self, client, minimal_valid_payload):
        payload = {k: v for k, v in minimal_valid_payload.items() if k != "rootAddress"}
        r = await client.post("/v1/analyze", json=payload)
        assert r.status_code == 422

    async def test_missing_analysis_request_id_returns_422(self, client, minimal_valid_payload):
        payload = {k: v for k, v in minimal_valid_payload.items() if k != "analysisRequestId"}
        r = await client.post("/v1/analyze", json=payload)
        assert r.status_code == 422

    async def test_empty_body_returns_422(self, client):
        r = await client.post("/v1/analyze", json={})
        assert r.status_code == 422

    async def test_content_type_json_required(self, client):
        r = await client.post("/v1/analyze", content=b"not json", headers={"Content-Type": "text/plain"})
        assert r.status_code in {415, 422}
