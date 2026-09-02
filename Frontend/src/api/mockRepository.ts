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
import { mockDelay } from './mockDelay';

// Import seeded JSON fixtures
import seededCaseData from '@/data/seeded-case.json';
import seededGraphData from '@/data/seeded-graph.json';
import seededFindingsData from '@/data/seeded-findings.json';
import seededAnalysisData from '@/data/seeded-analysis.json';
import seededEvidenceData from '@/data/seeded-evidence.json';

/**
 * MockCaseRepository — loads seeded JSON fixtures with simulated delays.
 * Enables full frontend development and demo without a running backend.
 */
export class MockCaseRepository implements CaseRepository {
  async listCases(): Promise<CaseSummary[]> {
    await mockDelay();
    return seededCaseData.cases as CaseSummary[];
  }

  async createCase(input: CreateCaseInput): Promise<CaseDetail> {
    await mockDelay(400, 1000);
    // Return the first seeded case as if it was just created
    const seeded = seededCaseData.cases[0];
    return {
      ...seeded,
      rootAddress: input.rootAddress,
      chainId: input.chainId,
      mode: input.mode,
      status: 'created',
      riskScore: 0,
      riskLevel: 'low',
      steps: {
        ingestion: 'pending',
        graph: 'pending',
        analysis: 'pending',
        report: 'not_started',
        evidence: 'not_started',
      },
      updatedAt: new Date().toISOString(),
      errorMessage: null,
    } as CaseDetail;
  }

  async getCase(caseId: string): Promise<CaseDetail> {
    await mockDelay();
    const found = seededCaseData.cases.find((c) => c.caseId === caseId);
    if (found) {
      return found as CaseDetail;
    }
    // Default to first seeded case
    return seededCaseData.cases[0] as CaseDetail;
  }

  async getGraph(_caseId: string): Promise<CaseGraph> {
    await mockDelay(500, 1200);
    return seededGraphData as CaseGraph;
  }

  async getFindings(_caseId: string): Promise<GraphFinding[]> {
    await mockDelay();
    return seededFindingsData.findings as GraphFinding[];
  }

  async analyzeCase(_caseId: string): Promise<AnalysisResult> {
    await mockDelay(800, 1500);
    return seededAnalysisData as AnalysisResult;
  }

  async generateReport(_caseId: string): Promise<ReportMetadata> {
    await mockDelay(600, 1200);
    return seededEvidenceData.report as ReportMetadata;
  }

  async getEvidence(_caseId: string): Promise<EvidenceMetadata> {
    await mockDelay();
    return seededEvidenceData.evidence as EvidenceMetadata;
  }

  async verifyEvidence(_input: VerifyEvidenceInput): Promise<EvidenceVerificationResult> {
    await mockDelay(400, 800);
    return seededEvidenceData.verification as EvidenceVerificationResult;
  }
}
