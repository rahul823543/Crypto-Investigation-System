// ─── Case Types ─────────────────────────────────────────────────────────────
// Aligned with Backend/packages/shared-types/src/case.ts

export type CaseMode = 'demo' | 'live';

export type CaseStatus =
  | 'created'
  | 'ingesting'
  | 'ingested'
  | 'graph_building'
  | 'graph_ready'
  | 'analyzing'
  | 'analyzed'
  | 'analysis_complete'
  | 'report_generating'
  | 'report_ready'
  | 'evidence_storing'
  | 'completed'
  | 'failed'
  | 'demo_fallback_used';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface CaseSteps {
  ingestion: 'pending' | 'running' | 'complete' | 'failed';
  graph: 'pending' | 'running' | 'complete' | 'failed';
  analysis: 'pending' | 'running' | 'complete' | 'failed';
  report: 'not_started' | 'generating' | 'ready' | 'failed';
  evidence: 'not_started' | 'storing' | 'stored' | 'failed';
}

export interface CaseSummary {
  caseId: string;
  rootAddress: string;
  chainId: number;
  mode: CaseMode;
  status: CaseStatus;
  riskScore: number;
  riskLevel: RiskLevel;
  createdAt: string;
}

export interface CaseDetail extends CaseSummary {
  steps: CaseSteps;
  updatedAt: string;
  errorMessage: string | null;
}

export interface CreateCaseInput {
  rootAddress: string;
  chainId: number;
  mode: CaseMode;
}
