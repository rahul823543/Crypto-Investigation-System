import type {
  CaseSummary,
  CaseDetail,
  CreateCaseInput,
  CaseGraph,
  GraphFinding,
  AnalysisResult,
  VaspAttribution,
  AnalysisResponse,
  AttributionResponse,
  ReportMetadata,
  EvidenceMetadata,
  EvidenceVerificationResult,
  VerifyEvidenceInput,
} from '@/types';
import type { CaseRepository } from './repository';
import { apiGet, apiPost } from './client';

/**
 * ApiCaseRepository — calls live Fastify endpoints.
 * Handles queue job triggering, polling, and data fetching for live mode.
 */
export class ApiCaseRepository implements CaseRepository {
  async listCases(): Promise<CaseSummary[]> {
    const data = await apiGet<{ cases: CaseSummary[] }>('/cases');
    return data.cases;
  }

  async createCase(input: CreateCaseInput): Promise<CaseDetail> {
    const res = await apiPost<{ case?: CaseDetail } & CaseDetail>('/cases', input);
    return res.case || res;
  }

  async getCase(caseId: string): Promise<CaseDetail> {
    const res = await apiGet<{ case?: CaseDetail } & CaseDetail>(`/cases/${caseId}`);
    return res.case || res;
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
    const data = await apiGet<AnalysisResponse>(`/cases/${caseId}/analysis`);
    if (data.status === 'complete' && data.analysis) {
      return data.analysis;
    }
    // In case the backend returns the raw completed analysis flattened
    if ((data as any).analysisId && (data as any).riskScore !== undefined) {
      return data as unknown as AnalysisResult;
    }
    return null;
  }

  async analyzeCase(caseId: string): Promise<AnalysisResult> {
    // 1. Post async analysis job
    await apiPost<{ message: string; caseId: string; status: string }>(`/cases/${caseId}/analyze`);

    // 2. Poll GET /cases/:id/analysis until status === 'complete'
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const res = await apiGet<AnalysisResponse>(`/cases/${caseId}/analysis`);
      if (res.status === 'complete' && res.analysis) {
        return res.analysis;
      }
      if ((res as any).analysisId && (res as any).riskScore !== undefined) {
        return res as unknown as AnalysisResult;
      }
    }

    throw new Error('Analysis processing timed out. Please retry in a few moments.');
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

  async getEvidence(caseId: string): Promise<EvidenceMetadata> {
    return apiGet<EvidenceMetadata>(`/cases/${caseId}/evidence`);
  }

  async anchorEvidence(caseId: string, reportId: string): Promise<EvidenceMetadata> {
    const data = await apiPost<{ evidenceRecord?: EvidenceMetadata; evidence?: EvidenceMetadata }>(`/cases/${caseId}/evidence`, { reportId });
    return (data.evidenceRecord || data.evidence || data) as EvidenceMetadata;
  }

  async verifyEvidence(input: VerifyEvidenceInput): Promise<EvidenceVerificationResult> {
    return apiPost<EvidenceVerificationResult>('/evidence/verify', input);
  }

  async getSeededCase(): Promise<any> {
    return apiGet('/demo/seeded-case');
  }
}
