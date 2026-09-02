// ─── Analysis Types ─────────────────────────────────────────────────────────
// Aligned with Backend/packages/shared-types/src/transaction.ts

import type { RiskLevel } from './case';
import type { GraphFinding } from './findings';

export interface SuspiciousPath {
  id: string;
  rank: number;
  score: number;
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

export interface AnalysisResult {
  caseId: string;
  analysisId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  findings: GraphFinding[];
  suspiciousPaths: SuspiciousPath[];
  circularFlows: CircularFlow[];
  analysisMetadata: AnalysisMetadata;
}
