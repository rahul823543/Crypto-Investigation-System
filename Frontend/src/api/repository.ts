import type {
  CaseSummary,
  CaseDetail,
  CreateCaseInput,
  CaseGraph,
  GraphFinding,
  AnalysisResult,
  AnalysisResponse,
  AnalysisTriggerResponse,
  VaspAttribution,
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
  getAnalysis(caseId: string): Promise<AnalysisResult | null>;
  getAnalysisStatus(caseId: string): Promise<AnalysisResponse>;
  analyzeCase(caseId: string): Promise<AnalysisTriggerResponse>;
  getAttribution(caseId: string): Promise<VaspAttribution | null>;
  generateReport(caseId: string): Promise<ReportMetadata>;
  listReports(caseId: string): Promise<ReportMetadata[]>;
  downloadReport(caseId: string, reportId: string): Promise<Blob>;
  getEvidence(caseId: string): Promise<EvidenceMetadata>;
  listEvidence(caseId: string): Promise<EvidenceMetadata[]>;
  anchorEvidence(caseId: string, reportId: string): Promise<EvidenceMetadata>;
  verifyEvidence(input: VerifyEvidenceInput): Promise<EvidenceVerificationResult>;
  getSeededCase?(): Promise<any>;
}
