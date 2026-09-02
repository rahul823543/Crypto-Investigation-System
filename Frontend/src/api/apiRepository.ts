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
import type { CaseRepository } from './repository';
import { apiGet, apiPost } from './client';

/**
 * ApiCaseRepository — calls live Fastify endpoints.
 * Stub for Phase 5 integration. Implements the same CaseRepository interface.
 */
export class ApiCaseRepository implements CaseRepository {
  async listCases(): Promise<CaseSummary[]> {
    const data = await apiGet<{ cases: CaseSummary[] }>('/cases');
    return data.cases;
  }

  async createCase(input: CreateCaseInput): Promise<CaseDetail> {
    return apiPost<CaseDetail>('/cases', input);
  }

  async getCase(caseId: string): Promise<CaseDetail> {
    return apiGet<CaseDetail>(`/cases/${caseId}`);
  }

  async getGraph(caseId: string): Promise<CaseGraph> {
    return apiGet<CaseGraph>(`/cases/${caseId}/graph`);
  }

  async getFindings(caseId: string): Promise<GraphFinding[]> {
    const data = await apiGet<{ findings: GraphFinding[] }>(`/cases/${caseId}/findings`);
    return data.findings;
  }

  async analyzeCase(caseId: string): Promise<AnalysisResult> {
    return apiPost<AnalysisResult>(`/cases/${caseId}/analyze`);
  }

  async generateReport(caseId: string): Promise<ReportMetadata> {
    return apiPost<ReportMetadata>(`/cases/${caseId}/reports`);
  }

  async getEvidence(caseId: string): Promise<EvidenceMetadata> {
    return apiGet<EvidenceMetadata>(`/cases/${caseId}/evidence`);
  }

  async verifyEvidence(input: VerifyEvidenceInput): Promise<EvidenceVerificationResult> {
    return apiPost<EvidenceVerificationResult>('/evidence/verify', input);
  }
}
