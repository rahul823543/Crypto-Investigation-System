// ─── Analysis Types ─────────────────────────────────────────────────────────
// Aligned with Backend/packages/shared-types/src/analysis.ts and attribution.ts

import type { RiskLevel } from './case';
import type { GraphFinding } from './findings';

/**
 * Simplified shape emitted by Python vasp_attribution.py for secondary candidates.
 * The backend only serializes { vaspNodeId, attributedVasp, hopDistance, confidence }
 * for candidates[1:5] — pathNodeIds, pathEdgeIds, and basis are intentionally omitted.
 */
export interface SecondaryCandidateAttribution {
  attributedVasp: string;
  vaspNodeId: string;
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
  secondaryCandidates?: SecondaryCandidateAttribution[];
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
  createdAt?: string;
}

export type AnalysisStatus = 'pending' | 'analyzing' | 'complete' | 'failed';

export interface AnalysisResponse {
  status: AnalysisStatus;
  analysis: AnalysisResult | null;
  message?: string;
  error?: string;
}

export interface AnalysisTriggerResponse {
  caseId: string;
  status: 'analyzing';
  message: string;
}

export interface AttributionResponse {
  status: AnalysisStatus;
  attribution: VaspAttribution | null;
  message?: string;
}
