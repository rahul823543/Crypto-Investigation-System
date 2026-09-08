import type {
  CaseSummary,
  CaseDetail,
  CreateCaseInput,
  CaseGraph,
  GraphFinding,
  AnalysisResult,
  VaspAttribution,
  AnalysisResponse,
  AnalysisTriggerResponse,
  AttributionResponse,
  ReportMetadata,
  EvidenceMetadata,
  EvidenceVerificationResult,
  VerifyEvidenceInput,
} from '@/types';
import type { CaseRepository } from './repository';
import { apiGet, apiPost } from './client';

function normalizeCase(c: any): CaseDetail {
  return {
    caseId: c.caseId ?? c.id,
    rootAddress: c.rootAddress,
    chainId: c.chainId,
    mode: c.mode,
    status: c.status,
    riskScore: c.riskScore ?? 0,
    riskLevel: c.riskLevel ?? 'low',
    errorMessage: c.errorMessage ?? null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt ?? c.createdAt,
    steps: c.steps ?? {
      ingestion: c.status === 'created' ? 'pending' : 'complete',
      graph: ['created', 'ingesting', 'ingested'].includes(c.status) ? 'pending' : 'complete',
      analysis: ['analyzed', 'analysis_complete', 'report_ready', 'completed'].includes(c.status) ? 'complete' : 'pending',
      report: 'not_started',
      evidence: 'not_started',
    },
  };
}

/**
 * ApiCaseRepository — calls live Fastify endpoints.
 * Handles queue job triggering, polling, and data fetching for live mode.
 */
export class ApiCaseRepository implements CaseRepository {
  async listCases(): Promise<CaseSummary[]> {
    const data = await apiGet<{ cases: any[] }>('/cases');
    return (data.cases || []).map((c) => ({
      caseId: c.caseId ?? c.id,
      rootAddress: c.rootAddress,
      chainId: c.chainId,
      mode: c.mode,
      status: c.status,
      riskScore: c.riskScore ?? 0,
      riskLevel: c.riskLevel ?? 'low',
      createdAt: c.createdAt,
    }));
  }

  async createCase(input: CreateCaseInput): Promise<CaseDetail> {
    const res = await apiPost<{ case?: any } & any>('/cases', input);
    return normalizeCase(res.case || res);
  }

  async getCase(caseId: string): Promise<CaseDetail> {
    const res = await apiGet<{ case?: any } & any>(`/cases/${caseId}`);
    return normalizeCase(res.case || res);
  }

  async getGraph(caseId: string): Promise<CaseGraph> {
    const data = await apiGet<{ nodes?: any[]; edges?: any[]; graph?: any }>(`/cases/${caseId}/graph`);
    const rawNodes = data.nodes ?? data.graph?.nodes ?? [];
    const rawEdges = data.edges ?? data.graph?.edges ?? [];

    const edges: CaseGraph['edges'] = rawEdges.map((e: any) => ({
      ...e,
      from: e.from ?? e.fromNodeId,
      to: e.to ?? e.toNodeId,
      transferType: e.transferType ?? 'erc20',
    }));

    return {
      caseId,
      nodes: rawNodes,
      edges,
      metadata: {
        nodeCount: rawNodes.length,
        edgeCount: edges.length,
        maxHopDepth: edges.reduce((max: number, edge: any) => Math.max(max, edge.hopDepth ?? 0), 0),
      },
    };
  }

  async getFindings(caseId: string): Promise<GraphFinding[]> {
    const data = await apiGet<{ findings: GraphFinding[] }>(`/cases/${caseId}/findings`);
    return data.findings;
  }

  async getAnalysis(caseId: string): Promise<AnalysisResult | null> {
    const data = await this.getAnalysisStatus(caseId);
    if (data.status === 'complete' && data.analysis) {
      return data.analysis;
    }
    // In case the backend returns the raw completed analysis flattened
    if ((data as any).analysisId && (data as any).riskScore !== undefined) {
      return data as unknown as AnalysisResult;
    }
    return null;
  }

  async getAnalysisStatus(caseId: string): Promise<AnalysisResponse> {
    return apiGet<AnalysisResponse>(`/cases/${caseId}/analysis`);
  }

  async analyzeCase(caseId: string): Promise<AnalysisTriggerResponse> {
    // Enqueue only. Completion, failure, and results are exposed by the
    // analysis-status endpoint and polled by the UI.
    return apiPost<AnalysisTriggerResponse>(`/cases/${caseId}/analyze`);
  }

  async getAttribution(caseId: string): Promise<VaspAttribution | null> {
    const data = await apiGet<AttributionResponse>(`/cases/${caseId}/attribution`);
    return data.attribution ?? null;
  }

  async generateReport(caseId: string): Promise<ReportMetadata> {
    const data = await apiPost<{ report?: any } & ReportMetadata>(`/cases/${caseId}/reports`);
    if (data.report) {
      return {
        caseId: data.report.caseId,
        reportId: data.report.id,
        status: data.report.status === 'generated' ? 'ready' : 'failed',
        computedHash: data.report.sha256Hash,
        generatedAt: data.report.createdAt,
      };
    }
    return data;
  }

  async listReports(caseId: string): Promise<ReportMetadata[]> {
    const data = await apiGet<{ reports?: any[] }>(`/cases/${caseId}/reports`);
    return (data.reports || []).map((r) => ({
      id: r.id,
      reportId: r.id,
      caseId: r.caseId,
      status: r.status === 'generated' ? 'ready' : r.status,
      computedHash: r.sha256Hash || r.computedHash,
      sha256Hash: r.sha256Hash,
      filePath: r.filePath,
      version: r.version ?? 1,
      generatedAt: r.createdAt || r.generatedAt || new Date().toISOString(),
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
    const data = await apiPost<{ evidenceRecord?: any; evidence?: any }>(`/cases/${caseId}/evidence`, { reportId });
    const rec = data.evidenceRecord || data.evidence || data;
    return {
      id: rec.id || 'ev_live',
      caseId: rec.caseId,
      reportId: rec.reportId,
      computedHash: rec.reportHash || rec.computedHash || '',
      reportHash: rec.reportHash || rec.computedHash,
      transactionHash: rec.transactionHash || '',
      contractAddress: rec.contractAddress || '',
      chainId: rec.chainId ?? 80002,
      version: rec.version ?? 1,
      storedAt: rec.storedAt || new Date().toISOString(),
      status: rec.verificationStatus === 'confirmed' ? 'stored' : 'failed',
      verificationStatus: rec.verificationStatus,
    };
  }

  async verifyEvidence(input: VerifyEvidenceInput): Promise<EvidenceVerificationResult> {
    return apiPost<EvidenceVerificationResult>('/evidence/verify', input);
  }

  async getSeededCase(): Promise<any> {
    return apiGet('/demo/seeded-case');
  }
}
