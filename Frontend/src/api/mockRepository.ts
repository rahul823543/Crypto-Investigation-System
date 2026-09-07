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
const dynamicReports: Map<string, ReportMetadata[]> = new Map();
const dynamicEvidence: Map<string, EvidenceMetadata[]> = new Map();

// Initialize with seeded cases
(seededCaseData.cases as CaseDetail[]).forEach((c) => {
  dynamicCases.set(c.caseId, c);
});

// Initialize seeded reports and evidence
const initialReport: ReportMetadata = {
  id: seededEvidenceData.report.reportId,
  reportId: seededEvidenceData.report.reportId,
  caseId: seededEvidenceData.report.caseId,
  status: 'ready',
  computedHash: seededEvidenceData.report.computedHash,
  sha256Hash: seededEvidenceData.report.computedHash,
  filePath: 'storage/reports/case_demo_001-v1.pdf',
  version: 1,
  generatedAt: seededEvidenceData.report.generatedAt,
};
dynamicReports.set('case_demo_001', [initialReport]);
dynamicReports.set('case_001', [
  { ...initialReport, caseId: 'case_001', reportId: 'report_001' },
]);

const initialEvidence: EvidenceMetadata = {
  id: 'ev_001',
  caseId: seededEvidenceData.evidence.caseId,
  reportId: seededEvidenceData.evidence.reportId,
  computedHash: seededEvidenceData.evidence.computedHash,
  reportHash: seededEvidenceData.evidence.computedHash,
  transactionHash: seededEvidenceData.evidence.transactionHash,
  contractAddress: seededEvidenceData.evidence.contractAddress,
  chainId: seededEvidenceData.evidence.chainId,
  version: seededEvidenceData.evidence.version,
  storedAt: seededEvidenceData.evidence.storedAt,
  status: 'stored',
  verificationStatus: 'confirmed',
};
dynamicEvidence.set('case_demo_001', [initialEvidence]);
dynamicEvidence.set('case_001', [
  { ...initialEvidence, caseId: 'case_001', reportId: 'report_001' },
]);

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
    return { ...seeded, caseId };
  }

  async getGraph(_caseId: string): Promise<CaseGraph> {
    await mockDelay(300, 700);
    return seededGraphData as CaseGraph;
  }

  async getFindings(_caseId: string): Promise<GraphFinding[]> {
    await mockDelay(200, 400);
    return seededFindingsData.findings as GraphFinding[];
  }

  async analyzeCase(caseId: string): Promise<AnalysisResult> {
    await mockDelay(800, 1500);
    const targetCase = dynamicCases.get(caseId);
    if (targetCase) {
      targetCase.status = 'analyzed';
      targetCase.steps.analysis = 'complete';
    }
    return {
      ...(seededAnalysisData as AnalysisResult),
      caseId,
    };
  }

  async getAnalysis(caseId: string): Promise<AnalysisResult> {
    await mockDelay(300, 600);
    return {
      ...(seededAnalysisData as AnalysisResult),
      caseId,
    };
  }

  async generateReport(caseId: string): Promise<ReportMetadata> {
    await mockDelay(600, 1200);
    const list = dynamicReports.get(caseId) || [];
    const version = list.length + 1;
    const reportId = `rep_${caseId.replace(/[^a-zA-Z0-9]/g, '')}_v${version}`;
    const generatedHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

    const newReport: ReportMetadata = {
      id: reportId,
      reportId,
      caseId,
      status: 'ready',
      computedHash: generatedHash,
      sha256Hash: generatedHash,
      filePath: `storage/reports/${caseId}-v${version}.pdf`,
      version,
      generatedAt: new Date().toISOString(),
    };

    dynamicReports.set(caseId, [newReport, ...list]);
    return newReport;
  }

  async listReports(caseId: string): Promise<ReportMetadata[]> {
    await mockDelay(200, 400);
    const list = dynamicReports.get(caseId);
    if (list && list.length > 0) {
      return [...list];
    }
    const defaultList: ReportMetadata[] = [
      {
        id: `rep_${caseId}_v1`,
        reportId: `rep_${caseId}_v1`,
        caseId,
        status: 'ready',
        computedHash: seededEvidenceData.report.computedHash,
        sha256Hash: seededEvidenceData.report.computedHash,
        filePath: `storage/reports/${caseId}-v1.pdf`,
        version: 1,
        generatedAt: new Date().toISOString(),
      },
    ];
    dynamicReports.set(caseId, defaultList);
    return defaultList;
  }

  async getEvidence(caseId: string): Promise<EvidenceMetadata> {
    await mockDelay(200, 400);
    const list = dynamicEvidence.get(caseId);
    if (list && list.length > 0) {
      return { ...list[0] };
    }
    return {
      id: `ev_${caseId}`,
      caseId,
      reportId: `rep_${caseId}_v1`,
      computedHash: seededEvidenceData.evidence.computedHash,
      reportHash: seededEvidenceData.evidence.computedHash,
      transactionHash: seededEvidenceData.evidence.transactionHash,
      contractAddress: seededEvidenceData.evidence.contractAddress,
      chainId: seededEvidenceData.evidence.chainId,
      version: 1,
      storedAt: seededEvidenceData.evidence.storedAt,
      status: 'stored',
      verificationStatus: 'confirmed',
    };
  }

  async listEvidence(caseId: string): Promise<EvidenceMetadata[]> {
    await mockDelay(200, 400);
    const list = dynamicEvidence.get(caseId);
    if (list && list.length > 0) {
      return [...list];
    }
    return [
      {
        id: `ev_${caseId}_v1`,
        caseId,
        reportId: `rep_${caseId}_v1`,
        computedHash: seededEvidenceData.evidence.computedHash,
        reportHash: seededEvidenceData.evidence.computedHash,
        transactionHash: seededEvidenceData.evidence.transactionHash,
        contractAddress: seededEvidenceData.evidence.contractAddress,
        chainId: seededEvidenceData.evidence.chainId,
        version: 1,
        storedAt: seededEvidenceData.evidence.storedAt,
        status: 'stored',
        verificationStatus: 'confirmed',
      },
    ];
  }

  async anchorEvidence(caseId: string, reportId: string): Promise<EvidenceMetadata> {
    await mockDelay(600, 1000);
    const list = dynamicEvidence.get(caseId) || [];
    const version = list.length + 1;
    const reports = dynamicReports.get(caseId) || [];
    const targetReport = reports.find((r) => r.reportId === reportId || r.id === reportId) || reports[0];
    const reportHash = targetReport?.computedHash || targetReport?.sha256Hash || seededEvidenceData.report.computedHash;

    const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    const newRecord: EvidenceMetadata = {
      id: `ev_${caseId}_v${version}`,
      caseId,
      reportId,
      computedHash: reportHash,
      reportHash,
      transactionHash: txHash,
      contractAddress: '0x71c504A7aFdC370B3C46c24385ea1502476b7A6B',
      chainId: 80002,
      version,
      storedAt: new Date().toISOString(),
      status: 'stored',
      verificationStatus: 'confirmed',
    };

    dynamicEvidence.set(caseId, [newRecord, ...list]);
    return newRecord;
  }

  async verifyEvidence(input: VerifyEvidenceInput): Promise<EvidenceVerificationResult> {
    await mockDelay(400, 800);
    const { caseId, reportId } = input;
    const list = dynamicEvidence.get(caseId) || [];
    const record = list.find((e) => e.reportId === reportId) || list[0];
    const reports = dynamicReports.get(caseId) || [];
    const report = reports.find((r) => r.reportId === reportId || r.id === reportId) || reports[0];

    const computedHash = report?.computedHash || report?.sha256Hash || seededEvidenceData.verification.computedHash;

    // Simulate scenario: if input.reportId contains "tamper" or "mismatch", return mismatch
    if (reportId.toLowerCase().includes('mismatch') || reportId.toLowerCase().includes('tamper')) {
      return {
        caseId,
        reportId,
        computedHash,
        onChainHash: '0xdeadbeef111122223333444455556666777788889999aaaabbbbccccddddeeee',
        verified: false,
        reason: 'computed hash does not match on-chain consensus record',
        contractAddress: '0x71c504A7aFdC370B3C46c24385ea1502476b7A6B',
        transactionHash: '0x3f5c9e2b1a8d7f4e6a0c8b2d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f',
        chainId: 80002,
        version: 1,
        storedAt: new Date().toISOString(),
      };
    }

    // Simulate scenario: if input.reportId contains "missing" or "unanchored"
    if (reportId.toLowerCase().includes('missing') || reportId.toLowerCase().includes('unanchored')) {
      return {
        caseId,
        reportId,
        computedHash,
        onChainHash: null,
        verified: false,
        reason: 'no evidence stored on-chain for this report',
        contractAddress: '0x71c504A7aFdC370B3C46c24385ea1502476b7A6B',
        transactionHash: null,
        chainId: 80002,
        version: null,
        storedAt: null,
      };
    }

    // Simulate scenario: error
    if (reportId.toLowerCase().includes('error')) {
      throw new Error('On-chain RPC connection timed out while querying EvidenceRegistry (Amoy Testnet RPC).');
    }

    // Normal verified case
    const onChainHash = record?.transactionHash ? computedHash : (record?.reportHash || computedHash);
    return {
      caseId,
      reportId,
      computedHash,
      onChainHash,
      verified: true,
      contractAddress: record?.contractAddress || '0x71c504A7aFdC370B3C46c24385ea1502476b7A6B',
      transactionHash: record?.transactionHash || '0x3f5c9e2b1a8d7f4e6a0c8b2d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f',
      chainId: record?.chainId || 80002,
      version: record?.version || 1,
      storedAt: record?.storedAt || new Date().toISOString(),
    };
  }
}

