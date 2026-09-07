// ─── Analysis Types ─────────────────────────────────────────────────────────
// Aligned with Backend/packages/shared-types/src/analysis.ts and attribution.ts

import type { RiskLevel } from './case';
import type { GraphFinding } from './findings';

export interface VaspAttribution {
  attributedVasp: string;
  vaspNodeId: string;
  hopDistance: number;
  confidence: number;
  pathNodeIds: string[];
  pathEdgeIds: string[];
  basis: string;
  secondaryCandidates?: VaspAttribution[];
}

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
  vaspAttribution?: VaspAttribution | null;
  analysisMetadata: AnalysisMetadata;
}

export type AnalysisStatus = 'pending' | 'complete' | 'failed';

export interface AnalysisResponse {
  status: AnalysisStatus;
  analysis: AnalysisResult | null;
  message?: string;
}

export interface AttributionResponse {
  status: AnalysisStatus;
  attribution: VaspAttribution | null;
  message?: string;
}
