import type { RiskLevel } from "./case.js";
import type { NormalizedTransaction } from "./transaction.js";

export type NodeType = "wallet" | "contract" | "exchange" | "dex" | "bridge" | "mixer" | "unknown";
export type AddressLabelType = "dex" | "bridge" | "mixer" | "risky" | "ofac";

// ─── Graph Node ─────────────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  caseId: string;
  address: string;
  type: NodeType;
  labels: string[];
  riskLevel: RiskLevel | null;
  totalInUsd: number | null;
  totalOutUsd: number | null;
  createdAt: string; // ISO date string
}

// ─── Graph Edge ──────────────────────────────────────────────────────────────

export interface GraphEdge {
  id: string;
  caseId: string;
  fromNodeId: string;
  toNodeId: string;
  from?: string; // backwards-compatible alias for fromNodeId
  to?: string;   // backwards-compatible alias for toNodeId
  transactionHash: string;
  asset: string;
  amount: string;
  amountUsd: number | null;
  timestamp: string; // ISO date string
  hopDepth: number;
  riskLevel: RiskLevel | null;
  createdAt: string; // ISO date string
}

// ─── Address Label ────────────────────────────────────────────────────────────

export interface AddressLabel {
  address: string;
  label: string;
  type: NodeType | AddressLabelType;
  chainId?: number | null;
}

// ─── Graph Build IO ──────────────────────────────────────────────────────────

export interface GraphBuildInput {
  caseId: string;
  rootAddress: string;
  transactions: NormalizedTransaction[];
  addressLabels?: AddressLabel[];
}

export interface GraphBuildOutput {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ─── Graph Response ──────────────────────────────────────────────────────────

export interface GraphResponse {
  caseId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}
