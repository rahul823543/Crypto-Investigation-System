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
    await apiPost<{ message: string; caseId: string; status: string }>(`/cases/${caseId}/analyze`);
    return this.getAnalysis(caseId);
  }

  async getAnalysis(caseId: string): Promise<AnalysisResult> {
    const data = await apiGet<any>(`/cases/${caseId}/analysis`);
    if (data.analysis) {
      return data.analysis as AnalysisResult;
    }
    return data as AnalysisResult;
  }

  async generateReport(caseId: string): Promise<ReportMetadata> {
    const data = await apiPost<{ report?: any }>(`/cases/${caseId}/reports`);
    const r = data.report || data;
    return {
      id: r.id || r.reportId,
      reportId: r.id || r.reportId,
      caseId: r.caseId,
      status: r.status,
      filePath: r.filePath,
      computedHash: r.sha256Hash || r.computedHash,
      sha256Hash: r.sha256Hash || r.computedHash,
      version: r.version,
      generatedAt: r.generatedAt,
    };
  }

  async listReports(caseId: string): Promise<ReportMetadata[]> {
    const data = await apiGet<{ reports?: any[] }>(`/cases/${caseId}/reports`);
    const list = data.reports || [];
    return list.map((r) => ({
      id: r.id || r.reportId,
      reportId: r.id || r.reportId,
      caseId: r.caseId,
      status: r.status,
      filePath: r.filePath,
      computedHash: r.sha256Hash || r.computedHash,
      sha256Hash: r.sha256Hash || r.computedHash,
      version: r.version,
      generatedAt: r.generatedAt,
    }));
  }

  async getEvidence(caseId: string): Promise<EvidenceMetadata> {
    const data = await apiGet<{ evidenceRecords?: any[] }>(`/cases/${caseId}/evidence`);
    const first = data.evidenceRecords?.[0];
    if (first) {
      return {
        id: first.id,
        caseId: first.caseId,
        reportId: first.reportId,
        computedHash: first.reportHash || first.computedHash,
        reportHash: first.reportHash,
        transactionHash: first.transactionHash,
        contractAddress: first.contractAddress,
        chainId: first.chainId,
        version: first.version,
        storedAt: first.storedAt,
        status: first.verificationStatus === 'confirmed' ? 'stored' : 'failed',
        verificationStatus: first.verificationStatus,
      };
    }
    return {
      caseId,
      reportId: '',
      computedHash: '',
      transactionHash: null,
      contractAddress: null,
      chainId: null,
      version: 0,
      storedAt: '',
      status: 'pending',
      verificationStatus: 'unanchored',
    };
  }

  async listEvidence(caseId: string): Promise<EvidenceMetadata[]> {
    const data = await apiGet<{ evidenceRecords?: any[] }>(`/cases/${caseId}/evidence`);
    return (data.evidenceRecords || []).map((rec) => ({
      id: rec.id,
      caseId: rec.caseId,
      reportId: rec.reportId,
      computedHash: rec.reportHash || rec.computedHash,
      reportHash: rec.reportHash,
      transactionHash: rec.transactionHash,
      contractAddress: rec.contractAddress,
      chainId: rec.chainId,
      version: rec.version,
      storedAt: rec.storedAt,
      status: rec.verificationStatus === 'confirmed' ? 'stored' : 'failed',
      verificationStatus: rec.verificationStatus,
    }));
  }

  async anchorEvidence(caseId: string, reportId: string): Promise<EvidenceMetadata> {
    const data = await apiPost<{ evidenceRecord?: any }>(`/cases/${caseId}/evidence`, { reportId });
    const rec = data.evidenceRecord || data;
    return {
      id: rec.id,
      caseId: rec.caseId,
      reportId: rec.reportId,
      computedHash: rec.reportHash || rec.computedHash,
      reportHash: rec.reportHash,
      transactionHash: rec.transactionHash,
      contractAddress: rec.contractAddress,
      chainId: rec.chainId,
      version: rec.version,
      storedAt: rec.storedAt,
      status: rec.verificationStatus === 'confirmed' ? 'stored' : 'failed',
      verificationStatus: rec.verificationStatus,
    };
  }

  async verifyEvidence(input: VerifyEvidenceInput): Promise<EvidenceVerificationResult> {
    return apiPost<EvidenceVerificationResult>('/evidence/verify', input);
  }
}
