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

// In-memory runtime state for mock cases created in current session
const dynamicCases: Map<string, CaseDetail> = new Map();

// Initialize with seeded cases
(seededCaseData.cases as CaseDetail[]).forEach((c) => {
  dynamicCases.set(c.caseId, c);
});

/**
 * MockCaseRepository — loads seeded JSON fixtures with simulated delays and dynamic step progression.
 * Enables full frontend development and demo without a running backend.
 */
export class MockCaseRepository implements CaseRepository {
  async listCases(): Promise<CaseSummary[]> {
    await mockDelay(200, 500);
    return Array.from(dynamicCases.values()).map((c) => ({
      caseId: c.caseId,
      rootAddress: c.rootAddress,
      chainId: c.chainId,
      mode: c.mode,
      status: c.status,
      riskScore: c.riskScore,
      riskLevel: c.riskLevel,
      createdAt: c.createdAt,
    }));
  }

  async createCase(input: CreateCaseInput): Promise<CaseDetail> {
    await mockDelay(300, 700);
    const newCaseId = `case_${String(dynamicCases.size + 1).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const newCase: CaseDetail = {
      caseId: newCaseId,
      rootAddress: input.rootAddress,
      chainId: input.chainId,
      mode: input.mode,
      status: 'ingesting',
      riskScore: 0,
      riskLevel: 'low',
      steps: {
        ingestion: 'running',
        graph: 'pending',
        analysis: 'pending',
        report: 'not_started',
        evidence: 'not_started',
      },
      createdAt: now,
      updatedAt: now,
      errorMessage: null,
    };

    dynamicCases.set(newCaseId, newCase);

    // Simulate asynchronous pipeline progression in background
    setTimeout(() => {
      const c = dynamicCases.get(newCaseId);
      if (c) {
        c.status = 'graph_building';
        c.steps.ingestion = 'complete';
        c.steps.graph = 'running';
        c.updatedAt = new Date().toISOString();
      }
    }, 2500);

    setTimeout(() => {
      const c = dynamicCases.get(newCaseId);
      if (c) {
        c.status = 'analyzing';
        c.steps.graph = 'complete';
        c.steps.analysis = 'running';
        c.updatedAt = new Date().toISOString();
      }
    }, 5000);

    setTimeout(() => {
      const c = dynamicCases.get(newCaseId);
      if (c) {
        c.status = 'analysis_complete';
        c.steps.analysis = 'complete';
        c.steps.report = 'ready';
        c.steps.evidence = 'stored';
        c.riskScore = 78;
        c.riskLevel = 'high';
        c.updatedAt = new Date().toISOString();
      }
    }, 7500);

    return newCase;
  }

  async getCase(caseId: string): Promise<CaseDetail> {
    await mockDelay(150, 400);
    const found = dynamicCases.get(caseId);
    if (found) {
      return { ...found };
    }
    const seeded = seededCaseData.cases[0] as CaseDetail;
    return { ...seeded };
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
