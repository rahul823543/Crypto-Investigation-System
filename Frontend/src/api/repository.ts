import type {
  CaseSummary,
  CaseDetail,
  CreateCaseInput,
  CaseGraph,
  GraphFinding,
  AnalysisResult,
  ReportMetadata,
  EvidenceMetadata,
  EvidenceVerificationResult,
  VerifyEvidenceInput,
} from '@/types';

/**
 * CaseRepository interface — the contract shared by mock and live API implementations.
 * UI components interact only through this interface, never directly with fetch/fixtures.
 */
export interface CaseRepository {
  listCases(): Promise<CaseSummary[]>;
  createCase(input: CreateCaseInput): Promise<CaseDetail>;
  getCase(caseId: string): Promise<CaseDetail>;
  getGraph(caseId: string): Promise<CaseGraph>;
  getFindings(caseId: string): Promise<GraphFinding[]>;
  analyzeCase(caseId: string): Promise<AnalysisResult>;
  generateReport(caseId: string): Promise<ReportMetadata>;
  getEvidence(caseId: string): Promise<EvidenceMetadata>;
  verifyEvidence(input: VerifyEvidenceInput): Promise<EvidenceVerificationResult>;
}
