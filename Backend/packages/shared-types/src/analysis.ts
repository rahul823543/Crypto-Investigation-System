import type { RiskLevel } from "./case.js";
import type { RiskFinding } from "./finding.js";
import type { GraphNode, GraphEdge } from "./graph.js";
import type { NormalizedTransaction } from "./transaction.js";
import type { VaspAttribution } from "./attribution.js";

export interface AnalysisRequest {
  caseId: string;
  analysisRequestId: string;
  rootAddress: string;
  /** Minimum confidence threshold for path scoring, 0–1 */
  minConfidence: number;
  /** Exponential decay factor applied per hop, 0–1 */
  decayFactor: number;
  /** Hard ceiling on traversal depth (recommended ≤ 15) */
  hardCeilingDepth: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  transactions: NormalizedTransaction[];
  basicFindings: RiskFinding[];
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
  riskLevel: RiskLevel;
  findings: RiskFinding[];
  suspiciousPaths: SuspiciousPath[];
  circularFlows: CircularFlow[];
  vaspAttribution?: VaspAttribution | null;
  analysisMetadata: AnalysisMetadata;
}
