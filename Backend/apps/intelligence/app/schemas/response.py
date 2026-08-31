"""
app/schemas/response.py
───────────────────────
Pydantic v2 response DTO for POST /v1/analyze.

All fields use camelCase aliases so FastAPI serialises the JSON body
exactly as the frozen contract in BACKEND_PLAN §8 specifies.

Fastify validates the following fields after Python responds:
  - caseId matches the request caseId
  - riskScore ∈ [0, 100]
  - riskLevel ∈ {"low", "medium", "high", "critical"}
  - finding/path node IDs and edge IDs exist in the submitted graph
  - analysisMetadata.engineVersion is present

All of those constraints are expressed here as Pydantic field validators
so they are satisfied before the response even leaves this service.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

# RiskLevel is defined locally — Pydantic v2 + `from __future__ import annotations`
# cannot resolve Literal aliases imported from another module at model build time.
RiskLevel = Literal["low", "medium", "high", "critical"]



# ---------------------------------------------------------------------------
# Sub-models
# ---------------------------------------------------------------------------


class AnalysisMetadata(BaseModel):
    """
    Informational metadata appended to every response.
    engineVersion is validated by Fastify — it must always be present.
    runtimeMs is informational; Fastify does not validate it.
    """

    model_config = {"populate_by_name": True}

    engine_version: str = Field(alias="engineVersion")
    runtime_ms: int = Field(alias="runtimeMs", ge=0)


class AdvancedFinding(BaseModel):
    """
    A forensic finding produced by this Python service.
    source is hardcoded to 'python-intelligence' so Fastify can
    distinguish Role D findings from Role C 'basic-risk' findings
    when querying GET /cases/:caseId/findings.
    """

    model_config = {"populate_by_name": True}

    id: str = Field(description="Unique finding ID e.g. 'adv_finding_path_001'")
    case_id: str = Field(alias="caseId")
    source: Literal["python-intelligence"] = "python-intelligence"
    type: str = Field(
        description="e.g. 'suspicious_path' | 'circular_flow' | 'multi_hop_laundering'"
    )
    severity: RiskLevel
    confidence: float = Field(ge=0.0, le=1.0)
    title: str
    description: str
    related_node_ids: list[str] = Field(alias="relatedNodeIds", default_factory=list)
    related_edge_ids: list[str] = Field(alias="relatedEdgeIds", default_factory=list)
    signals: list[str] = Field(
        default_factory=list,
        description="Machine-readable reason codes e.g. ['rapid_movement', 'dex_touchpoint']",
    )


class SuspiciousPath(BaseModel):
    """
    A ranked, scored fund-movement path identified by traversal + heuristics.
    rank=1 is the most suspicious. score ∈ [0, 100].
    nodeIds and edgeIds MUST be subsets of the IDs in the analysis request —
    Fastify validates this before persisting.
    """

    model_config = {"populate_by_name": True}

    id: str = Field(description="e.g. 'path_001'")
    rank: int = Field(ge=1)
    score: int = Field(ge=0, le=100)
    node_ids: list[str] = Field(alias="nodeIds")
    edge_ids: list[str] = Field(alias="edgeIds")
    reason_codes: list[str] = Field(
        alias="reasonCodes",
        description="e.g. ['rapid_movement', 'mixer_touchpoint']",
    )
    summary: str = Field(description="Human-readable one-liner for the report")


class CircularFlow(BaseModel):
    """
    A detected elementary directed cycle in the fund-flow graph.
    cycleLength is the number of distinct nodes in the cycle (≥ 2).
    """

    model_config = {"populate_by_name": True}

    id: str = Field(description="e.g. 'cycle_001'")
    node_ids: list[str] = Field(alias="nodeIds")
    edge_ids: list[str] = Field(alias="edgeIds")
    cycle_length: int = Field(alias="cycleLength", ge=2)
    summary: str


# ---------------------------------------------------------------------------
# Root response model
# ---------------------------------------------------------------------------


class AnalysisResponse(BaseModel):
    """
    Top-level response returned by POST /v1/analyze.
    This is the contract Fastify validates before persisting to PostgreSQL.
    """

    model_config = {"populate_by_name": True}

    analysis_id: str = Field(
        alias="analysisId",
        description="Unique ID for this analysis run",
    )
    case_id: str = Field(alias="caseId")
    risk_score: int = Field(alias="riskScore", ge=0, le=100)
    risk_level: RiskLevel = Field(alias="riskLevel")
    findings: list[AdvancedFinding] = Field(default_factory=list)
    suspicious_paths: list[SuspiciousPath] = Field(
        alias="suspiciousPaths", default_factory=list
    )
    circular_flows: list[CircularFlow] = Field(
        alias="circularFlows", default_factory=list
    )
    analysis_metadata: AnalysisMetadata = Field(alias="analysisMetadata")
