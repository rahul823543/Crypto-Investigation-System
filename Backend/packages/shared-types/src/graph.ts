export type NodeType = "wallet" | "contract" | "dex" | "bridge" | "mixer" | "unknown";
export type RiskLevel = "low" | "medium" | "high" | "critical";

// ─── Graph Node ─────────────────────────────────────────────────────────────

export interface GraphNode {
  /** Stable ID: "wallet:0x..." | "dex:0x..." | "bridge:0x..." */
  id: string;
  address: string;
  type: NodeType;
  /** Role C classification labels e.g. ["root", "dex"] */
  labels: string[];
  riskLevel: RiskLevel;
  totalInUsd: number;
  totalOutUsd: number;
}

// ─── Graph Edge ──────────────────────────────────────────────────────────────

export interface GraphEdge {
  /** Stable ID: "edge:0x{txHash}:{index}" */
  id: string;
  from: string;   // GraphNode.id
  to: string;     // GraphNode.id
  transactionHash: string;
  asset: string;
  amount: string;
  amountUsd: number;
  timestamp: string; // ISO-8601
  hopDepth: number;
  riskLevel: RiskLevel;
}

// ─── Graph Response ──────────────────────────────────────────────────────────

export interface GraphResponse {
  caseId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ─── Risk Finding ─────────────────────────────────────────────────────────────

export type FindingSource = "basic-risk" | "python-intelligence";
export type FindingType =
  | "fan_out"
  | "dex_interaction"
  | "bridge_interaction"
  | "known_risky_address"
  | "suspicious_path"
  | "circular_flow"
  | "multi_hop_laundering";

export interface RiskFinding {
  id: string;
  caseId: string;
  source: FindingSource;
  type: FindingType;
  severity: RiskLevel;
  confidence: number; // 0.0 – 1.0
  title: string;
  description: string;
  relatedNodeIds: string[];
  relatedEdgeIds: string[];
  signals: string[];
}

// ─── Address Label ────────────────────────────────────────────────────────────

export type AddressLabelType = "dex" | "bridge" | "mixer" | "risky" | "ofac";

export interface AddressLabel {
  address: string;
  type: AddressLabelType;
  label: string;
  /** null means applies across all chains */
  chainId: number | null;
}
