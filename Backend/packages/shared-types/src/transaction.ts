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
  /** 1–3 for MVP */
  maxDepth: number;
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
  analysisMetadata: AnalysisMetadata;
}
