"""
app/api/routes.py
─────────────────
**v3 Phase 4**: Real algorithm pipeline for POST /v1/analyze.

Pipeline (in order):
  1. Build MultiDiGraph from the AnalysisRequest (Phase 2 graph.builder)
  2. Enumerate paths using confidence-decay stopping (Phase 4 traversal)
  3. Re-order paths by suspicion-first priority queue (Phase 4)
  4. Detect circular flows (Phase 3 detection, unchanged)
  5. Flag suspicious paths using heuristic signals (Phase 3 detection)
  6. Score and rank suspicious paths (Phase 3 ranking)
  7. Compute composite risk score (Phase 3 scoring)
  8. Compute nearest-VASP attribution (Phase 4 attribution)
  9. Generate AdvancedFinding DTOs
  10. Return AnalysisResponse with vaspAttribution field

Contract guarantees (unchanged from Phase 1 mock):
  - caseId is echoed from the request
  - analysisId is deterministic: f"analysis_{caseId}_{analysisRequestId}"
  - riskScore in [0, 100]
  - riskLevel in {"low", "medium", "high", "critical"}
  - analysisMetadata.engineVersion is always present
  - runtimeMs is measured wall-clock time
  - All nodeIds/edgeIds in paths/findings are subsets of the request graph
  - vaspAttribution is null (not omitted) when no confident VASP match found
"""
from __future__ import annotations

import time

from fastapi import APIRouter

from app.attribution.vasp_attribution import compute_vasp_attribution
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
from app.traversal.priority_queue import rank_paths_by_priority

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
    v3 Phase 4 — confidence-decay traversal + VASP attribution.

    The route path, request schema, and response schema contract are frozen
    from Phase 1. The body now runs the full v3 algorithm pipeline.
    """
    t0 = time.monotonic()

    # ------------------------------------------------------------------ #
    # Step 1 — Build graph
    # ------------------------------------------------------------------ #
    G = build_graph(payload)

    # ------------------------------------------------------------------ #
    # Step 2 — Confidence-decay traversal (v3 §7, replaces fixed-depth DFS)
    # ------------------------------------------------------------------ #
    raw_path_states = traverse_paths(
        G,
        min_confidence=payload.min_confidence,
        decay_factor=payload.decay_factor,
        hard_ceiling_depth=payload.hard_ceiling_depth,
        hub_threshold=payload.hub_threshold,
    )

    # ------------------------------------------------------------------ #
    # Step 3 — Re-order by suspicion-first priority queue (v3 §7)
    # ------------------------------------------------------------------ #
    ranked_path_states = rank_paths_by_priority(G, raw_path_states)

    # Convert PathState objects to plain node-ID lists for downstream modules
    # (detection/ranking modules still expect list[list[str]])
    raw_paths = [ps.node_ids for ps in ranked_path_states]

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
    # Step 8 — VASP attribution (v3 §7, byproduct of same traversal)
    # ------------------------------------------------------------------ #
    vasp_attribution = compute_vasp_attribution(
        G,
        ranked_path_states,
        min_confidence=payload.min_confidence,
    )

    # ------------------------------------------------------------------ #
    # Step 9 — Generate AdvancedFinding DTOs
    # ------------------------------------------------------------------ #
    findings = _build_findings(payload.case_id, suspicious_paths, circular_flows)

    # ------------------------------------------------------------------ #
    # Step 10 — Assemble and return
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
        vaspAttribution=vasp_attribution,
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
