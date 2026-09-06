"""
app/schemas/investigation.py
────────────────────────────
Pydantic v2 request DTO for POST /v1/analyze per BACKEND_PLAN_v3 §3, §7, §8.

Field names use Python snake_case internally but are serialised/deserialised
using camelCase aliases — matching the frozen JSON contract in BACKEND_PLAN §8.

Two cross-field validators enforce structural correctness:
  1. rootAddress must be a valid EVM address (0x + 40 hex chars).
  2. Every edge from/to must reference a node ID present in nodes[].
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
_EVM_ADDRESS_RE = re.compile(r"^0x[0-9a-fA-F]{40}$")

# Supported transfer types (from BACKEND_PLAN §5 Normalized Transaction Schema)
TransferType = Literal["native", "erc20"]

# Node types produced by Role C (BACKEND_PLAN §6)
NodeType = Literal["wallet", "contract", "dex", "bridge", "mixer", "vasp", "unknown"]

# Risk levels used across the contract
RiskLevel = Literal["low", "medium", "high", "critical"]


# ---------------------------------------------------------------------------
# Sub-models
# ---------------------------------------------------------------------------

class GraphNode(BaseModel):
    """
    A single node as produced by Role C's graph builder.
    Stable ID format: "wallet:0x{address}" or "contract:0x{address}"
    """

    model_config = {"populate_by_name": True}

    id: str = Field(description="Stable node ID, e.g. 'wallet:0x111...'")
    address: str
    type: str = Field(description="Node type: wallet | contract | dex | bridge | mixer | vasp")
    labels: list[str] = Field(
        default_factory=list,
        description="Role C classification labels e.g. ['root', 'dex', 'vasp']",
    )
    risk_level: RiskLevel = Field(alias="riskLevel", default="low")
    total_in_usd: float = Field(alias="totalInUsd", default=0.0, ge=0)
    total_out_usd: float = Field(alias="totalOutUsd", default=0.0, ge=0)
    # v3: traversal pruning flags produced by Role C node classification
    is_traceable_dead_end: bool = Field(
        alias="isTraceableDeadEnd",
        default=False,
        description=(
            "True for mixer/VASP/unlabeled-hub nodes. "
            "Python traversal stops expanding past these nodes — "
            "label logic lives in Role C, not here."
        ),
    )
    out_degree: int = Field(
        alias="outDegree",
        default=0,
        ge=0,
        description="Number of outgoing edges; used alongside hubThreshold to prune unlabeled hubs.",
    )


class GraphEdge(BaseModel):
    """
    A directed edge between two graph nodes.
    Stable ID format: "edge:0x{txHash}:{index}"
    """

    model_config = {"populate_by_name": True}

    id: str = Field(description="Stable edge ID, e.g. 'edge:0xabc...:0'")
    from_node: str = Field(alias="from", description="Source node ID")
    to_node: str = Field(alias="to", description="Destination node ID")
    transaction_hash: str = Field(alias="transactionHash")
    asset: str = Field(description="Token symbol e.g. 'ETH', 'USDC'")
    amount: str = Field(description="Raw amount string")
    amount_usd: float = Field(alias="amountUsd", default=0.0, ge=0)
    timestamp: datetime
    hop_depth: int = Field(alias="hopDepth", ge=1, le=10)
    risk_level: RiskLevel = Field(alias="riskLevel", default="low")


class NormalizedTransaction(BaseModel):
    """
    A single transaction as normalised by Role B's ingestion pipeline.
    Matches BACKEND_PLAN §5 Normalized Transaction Schema exactly.
    """

    model_config = {"populate_by_name": True}

    id: str
    case_id: str = Field(alias="caseId")
    hash: str = Field(description="Transaction hash (0x-prefixed)")
    chain_id: int = Field(alias="chainId")
    block_number: int = Field(alias="blockNumber")
    from_address: str = Field(alias="from")
    to_address: str = Field(alias="to")
    asset: str
    token_address: str | None = Field(alias="tokenAddress", default=None)
    amount: str
    amount_usd: float = Field(alias="amountUsd", default=0.0, ge=0)
    timestamp: datetime
    transfer_type: TransferType = Field(alias="transferType")
    method: str | None = Field(default=None)


class BasicFinding(BaseModel):
    """
    A finding emitted by Role C's basic risk detectors.
    Source is always 'basic-risk' — this is enforced as a Literal.
    """

    model_config = {"populate_by_name": True}

    id: str
    case_id: str = Field(alias="caseId")
    source: Literal["basic-risk"]
    type: str = Field(
        description=(
            "fan_out | dex_interaction | bridge_interaction | "
            "known_risky_address | mixer_interaction | vasp_direct_touch"
        )
    )
    severity: RiskLevel
    confidence: float = Field(ge=0.0, le=1.0)
    title: str
    description: str
    related_node_ids: list[str] = Field(alias="relatedNodeIds", default_factory=list)
    related_edge_ids: list[str] = Field(alias="relatedEdgeIds", default_factory=list)
    signals: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Root request model
# ---------------------------------------------------------------------------

class AnalysisRequest(BaseModel):
    """
    Top-level payload sent by Fastify to POST /v1/analyze.
    All cross-field validation happens here so downstream algorithms
    can assume a structurally sound, self-consistent graph payload.
    """

    model_config = {"populate_by_name": True}

    case_id: str = Field(alias="caseId")
    analysis_request_id: str = Field(alias="analysisRequestId")
    root_address: str = Field(alias="rootAddress")
    # v3 §7: confidence-decay traversal control — replaces the old fixed maxDepth.
    # minConfidence: stop expanding a path when confidence decays below this.
    # decayFactor:   per-hop confidence retention (0.65 → keeps 65% each hop).
    # hardCeilingDepth: safety valve — rarely hit; decay is the real stopper.
    # hubThreshold:  unlabeled out-degree above which a node is treated as a hub.
    min_confidence: float = Field(
        alias="minConfidence", default=0.15, ge=0.0, le=1.0
    )
    decay_factor: float = Field(
        alias="decayFactor", default=0.65, ge=0.0, le=1.0
    )
    hard_ceiling_depth: int = Field(
        alias="hardCeilingDepth", default=10, ge=1, le=15
    )
    hub_threshold: int = Field(
        alias="hubThreshold", default=500, ge=1
    )
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    transactions: list[NormalizedTransaction] = Field(default_factory=list)
    basic_findings: list[BasicFinding] = Field(
        alias="basicFindings", default_factory=list
    )

    # ------------------------------------------------------------------
    # Validator 1: rootAddress must be a valid EVM address
    # ------------------------------------------------------------------
    @field_validator("root_address", mode="after")
    @classmethod
    def validate_evm_address(cls, v: str) -> str:
        if not _EVM_ADDRESS_RE.match(v):
            raise ValueError(
                f"rootAddress must be a valid EVM address (0x + 40 hex chars), got: {v!r}"
            )
        return v.lower()  # normalise to lowercase for consistent graph lookups

    # ------------------------------------------------------------------
    # Validator 2: every edge must reference node IDs present in nodes[]
    # ------------------------------------------------------------------
    @model_validator(mode="after")
    def edges_reference_existing_nodes(self) -> "AnalysisRequest":
        node_ids = {n.id for n in self.nodes}
        for edge in self.edges:
            if edge.from_node not in node_ids:
                raise ValueError(
                    f"Edge {edge.id!r} references unknown from-node {edge.from_node!r}. "
                    f"Known node IDs: {sorted(node_ids)}"
                )
            if edge.to_node not in node_ids:
                raise ValueError(
                    f"Edge {edge.id!r} references unknown to-node {edge.to_node!r}. "
                    f"Known node IDs: {sorted(node_ids)}"
                )
        return self
