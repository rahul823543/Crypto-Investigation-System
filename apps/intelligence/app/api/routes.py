"""
app/api/routes.py
─────────────────
Phase 1: deterministic mock implementation of POST /v1/analyze.

The mock returns a structurally-valid, hardcoded response for any
well-formed request — unblocking Role B's intelligence.client.ts
integration before the real graph algorithms are wired in.

Contract guarantees (enforced even in the mock):
  - caseId echoed from request
  - analysisId is deterministic: f"analysis_{caseId}_{analysisRequestId}"
  - riskScore ∈ [0, 100]
  - riskLevel ∈ {"low", "medium", "high", "critical"}
  - analysisMetadata.engineVersion is always present
  - suspiciousPaths, circularFlows, findings are valid empty lists
  - runtimeMs is measured wall-clock time (always accurate)

When Phase 4 algorithms are ready, the body of `analyze()` is replaced
in-place — the route path, request schema, and response schema stay frozen.
"""
from __future__ import annotations

import time

from fastapi import APIRouter

from app.config import settings
from app.schemas.request import AnalysisRequest
from app.schemas.response import AnalysisMetadata, AnalysisResponse

router = APIRouter()


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


@router.get(
    "/health",
    summary="Health check",
    description="Returns service liveness and the engine version. "
    "Fastify polls this before treating the service as available.",
    tags=["Operations"],
)
def health_check() -> dict:
    return {
        "status": "ok",
        "engineVersion": settings.engine_version,
        "service": "python-intelligence",
    }


# ---------------------------------------------------------------------------
# Primary analysis endpoint
# ---------------------------------------------------------------------------


@router.post(
    "/v1/analyze",
    response_model=AnalysisResponse,
    summary="Run forensic analysis on a transaction graph",
    description=(
        "Accepts the normalised graph payload from Fastify and returns an "
        "advanced risk analysis. Phase 1 returns a deterministic mock "
        "response; Phases 2-4 replace the body with real algorithms."
    ),
    tags=["Analysis"],
)
def analyze(payload: AnalysisRequest) -> AnalysisResponse:
    """
    Phase 1 — deterministic mock.

    All Pydantic validators on `AnalysisRequest` have already run by the time
    this function body executes, meaning:
      - rootAddress is a valid EVM address
      - every edge references a node ID present in nodes[]
      - maxDepth ∈ [1, 3]

    The mock body will be replaced with real graph-algorithm calls in Phase 4.
    """
    t0 = time.monotonic()

    # ------------------------------------------------------------------
    # MOCK RESPONSE (Phase 1)
    # Replace everything between these markers in Phase 4.
    # ------------------------------------------------------------------

    response = AnalysisResponse(
        analysisId=f"analysis_{payload.case_id}_{payload.analysis_request_id}",
        caseId=payload.case_id,
        riskScore=42,          # Hardcoded mock score — signals the mock is active
        riskLevel="medium",    # Hardcoded mock level
        findings=[],
        suspiciousPaths=[],
        circularFlows=[],
        analysisMetadata=AnalysisMetadata(
            engineVersion=settings.engine_version,
            runtimeMs=int((time.monotonic() - t0) * 1000),
        ),
    )

    # ------------------------------------------------------------------
    # END MOCK RESPONSE
    # ------------------------------------------------------------------

    return response
