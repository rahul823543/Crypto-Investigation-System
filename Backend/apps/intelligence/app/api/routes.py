"""
app/api/routes.py
─────────────────
Phase 3: Real algorithm implementation of POST /v1/analyze.

Pipeline (in order):
  1. Build MultiDiGraph from the AnalysisRequest (Phase 2 graph.builder)
  2. Enumerate all simple paths up to max_depth (Phase 3 traversal)
  3. Detect circular flows (Phase 3 detection)
  4. Flag suspicious paths using 6 heuristic signals (Phase 3 detection)
  5. Score and rank suspicious paths (Phase 3 ranking)
  6. Compute composite risk score (Phase 3 scoring)
  7. Generate AdvancedFinding DTOs from the top paths and all cycles
  8. Return AnalysisResponse (contract frozen since Phase 1)

Contract guarantees (unchanged from Phase 1 mock):
  - caseId is echoed from the request
  - analysisId is deterministic: f"analysis_{caseId}_{analysisRequestId}"
  - riskScore ∈ [0, 100]
  - riskLevel ∈ {"low", "medium", "high", "critical"}
  - analysisMetadata.engineVersion is always present
  - runtimeMs is measured wall-clock time
  - All nodeIds and edgeIds in paths/findings are subsets of the request graph
    (guaranteed because traversal only walks existing nodes and edges)
"""
from __future__ import annotations

import time

from fastapi import APIRouter

from app.config import settings
from app.detection.circular_flows import detect_circular_flows
from app.detection.suspicious_paths import detect_suspicious_paths
from app.graph.builder import build_graph
from app.ranking.path_ranker import rank_paths
from app.schemas.request import AnalysisRequest
from app.schemas.response import (
    AdvancedFinding,
    AnalysisMetadata,
    AnalysisResponse,
    CircularFlow,
    SuspiciousPath,
)
from app.scoring.risk_score import compute_risk_score, score_to_level
from app.traversal.multi_hop import traverse_paths

router = APIRouter()



# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


@router.get(
    "/health",
    summary="Health check",
    description=(
        "Returns service liveness and the engine version. "
        "Fastify polls this before treating the service as available."
    ),
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
        "advanced risk analysis. Phase 3 runs real traversal, detection, "
        "ranking, and scoring algorithms."
    ),
    tags=["Analysis"],
)
def analyze(payload: AnalysisRequest) -> AnalysisResponse:
    """
    Phase 3 — real pipeline.

    The route path, request schema, and response schema are frozen from
    Phase 1. Only the body changes.
    """
    t0 = time.monotonic()

    # ------------------------------------------------------------------ #
    # Step 1 — Build graph
    # ------------------------------------------------------------------ #
    G = build_graph(payload)

    # ------------------------------------------------------------------ #
    # Step 2 — Enumerate simple paths up to max_depth
    # ------------------------------------------------------------------ #
    raw_paths = traverse_paths(G, payload.max_depth)

    # ------------------------------------------------------------------ #
    # Step 3 — Detect circular flows
    # ------------------------------------------------------------------ #
    circular_flows = detect_circular_flows(G)

    # ------------------------------------------------------------------ #
    # Step 4 — Flag suspicious paths (cross-referencing circular flows)
    # ------------------------------------------------------------------ #
    suspicious_paths_unranked = detect_suspicious_paths(
        G, raw_paths, circular_flows=circular_flows
    )

    # ------------------------------------------------------------------ #
    # Step 5 — Score and rank
    # ------------------------------------------------------------------ #
    suspicious_paths = rank_paths(suspicious_paths_unranked)

    # ------------------------------------------------------------------ #
    # Step 6 — Composite risk score
    # ------------------------------------------------------------------ #
    basic_findings_raw = [f.model_dump() for f in payload.basic_findings]
    risk_score, risk_level = compute_risk_score(
        suspicious_paths,
        circular_flows,
        basic_findings_raw,
    )

    # ------------------------------------------------------------------ #
    # Step 7 — Generate AdvancedFinding DTOs
    # ------------------------------------------------------------------ #
    findings = _build_findings(payload.case_id, suspicious_paths, circular_flows)

    # ------------------------------------------------------------------ #
    # Step 8 — Assemble and return
    # ------------------------------------------------------------------ #
    runtime_ms = int((time.monotonic() - t0) * 1000)

    return AnalysisResponse(
        analysisId=f"analysis_{payload.case_id}_{payload.analysis_request_id}",
        caseId=payload.case_id,
        riskScore=risk_score,
        riskLevel=risk_level,
        findings=findings,
        suspiciousPaths=suspicious_paths,
        circularFlows=circular_flows,
        analysisMetadata=AnalysisMetadata(
            engineVersion=settings.engine_version,
            runtimeMs=runtime_ms,
        ),
    )


# ---------------------------------------------------------------------------
# Finding generation
# ---------------------------------------------------------------------------


def _build_findings(
    case_id: str,
    suspicious_paths: list[SuspiciousPath],
    circular_flows: list[CircularFlow],
) -> list[AdvancedFinding]:
    """
    Convert the top suspicious paths and all circular flows into
    AdvancedFinding DTOs for Fastify to persist with
    source='python-intelligence'.
    """
    findings: list[AdvancedFinding] = []
    idx = 1

    # One finding per suspicious path (top 5 only to keep reports concise)
    for path in suspicious_paths[:5]:
        severity = score_to_level(path.score)
        # Forensic confidence calibrated by signal density [0.70, 0.95]
        confidence = min(0.95, round(0.70 + (len(path.reason_codes) * 0.08), 2))
        findings.append(
            AdvancedFinding(
                id=f"adv_finding_path_{idx:03d}",
                caseId=case_id,
                type="suspicious_path",
                severity=severity,
                confidence=confidence,
                title=f"Suspicious path detected (rank {path.rank})",
                description=path.summary,
                relatedNodeIds=path.node_ids,
                relatedEdgeIds=path.edge_ids,
                signals=path.reason_codes,
            )
        )
        idx += 1

    # One finding per circular flow
    for flow in circular_flows:
        findings.append(
            AdvancedFinding(
                id=f"adv_finding_cycle_{idx:03d}",
                caseId=case_id,
                type="circular_flow",
                severity="high",
                confidence=0.85,
                title="Circular fund flow detected",
                description=flow.summary,
                relatedNodeIds=flow.node_ids,
                relatedEdgeIds=flow.edge_ids,
                signals=["circular_return"],
            )
        )
        idx += 1

    return findings
