export type TransferType = "native" | "erc20";

export interface NormalizedTransaction {
  id: string;
  caseId: string;
  hash: string;
  chainId: number;
  blockNumber: number;
  /** Source wallet address */
  from: string;
  /** Destination address */
  to: string;
  /** Token symbol e.g. "ETH", "USDC" */
  asset: string;
  /** ERC-20 contract address; null for native transfers */
  tokenAddress: string | null;
  /** Raw amount string */
  amount: string;
  /** USD equivalent at time of transfer; null when price data is unavailable */
  amountUsd: number | null;
  timestamp: string; // ISO-8601
  transferType: TransferType;
  /** ABI-decoded method name e.g. "transfer", "swapExactTokensForTokens" */
  method: string | null;
  /** Opaque deduplication key supplied by the data provider (e.g. Alchemy uniqueId) */
  rawProviderRef: string | null;
}

/**
 * Write-only shape produced by the normalizer before a DB record exists.
 * Omits `id` and `caseId` which are assigned at persist time.
 */
export type NormalizedTransactionInput = Omit<NormalizedTransaction, "id" | "caseId">;

// ─── Python Intelligence Contract ─────────────────────────────────────────────

export interface AnalysisRequest {
  caseId: string;
  analysisRequestId: string;
  rootAddress: string;
  /** Stop expanding a path once decayed confidence falls below this (default: 0.15) */
  minConfidence?: number;
  /** Per-hop confidence retention fraction (default: 0.65) */
  decayFactor?: number;
  /** Maximum traversal hop limit safety valve (default: 10) */
  hardCeilingDepth?: number;
  /** Unlabeled out-degree threshold above which a node is treated as a hub (default: 500) */
  hubThreshold?: number;
  /** Legacy depth limit; retained for backwards compatibility */
  maxDepth?: number;
  nodes: import("./graph").GraphNode[];
  edges: import("./graph").GraphEdge[];
  transactions: NormalizedTransaction[];
  basicFindings: import("./finding").RiskFinding[];
}

export interface SuspiciousPath {
  id: string;
  rank: number;
  score: number; // 0–100
  nodeIds: string[];
  edgeIds: string[];
  reasonCodes: string[];
  summary: string;
}

export interface CircularFlow {
  id: string;
  nodeIds: string[];
  edgeIds: string[];
  cycleLength: number;
  summary: string;
}

export interface VaspAttributionSecondaryCandidate {
  vaspNodeId: string;
  attributedVasp: string;
  hopDistance: number;
  confidence: number;
}

export interface VaspAttribution {
  attributedVasp: string;
  vaspNodeId: string;
  hopDistance: number;
  confidence: number;
  pathNodeIds: string[];
  pathEdgeIds: string[];
  basis: string;
  secondaryCandidates: VaspAttributionSecondaryCandidate[];
}

export interface AnalysisMetadata {
  engineVersion: string;
  runtimeMs: number;
}

export interface AnalysisResponse {
  analysisId: string;
  caseId: string;
  riskScore: number; // 0–100
  riskLevel: import("./case").RiskLevel;
  findings: import("./finding").RiskFinding[];
  suspiciousPaths: SuspiciousPath[];
  circularFlows: CircularFlow[];
  vaspAttribution: VaspAttribution | null;
  analysisMetadata: AnalysisMetadata;
}
