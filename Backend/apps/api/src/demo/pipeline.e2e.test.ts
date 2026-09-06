import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { buildGraph } from "../modules/graph/graph.builder.js";
import { runRiskDetectors } from "../modules/risk/risk.detector.js";
import { calculateRiskScore } from "../modules/risk/riskScore.js";
import {
  validatePreAnalysisRequest,
  validateAnalysisResponse,
} from "../modules/analysis/analysis.validation.js";
import { generateReportPdf } from "../modules/reports/report.generator.js";
import { hashBuffer } from "../modules/evidence/hash.service.js";
import { evidenceRoutes } from "../modules/evidence/evidence.routes.js";
import { analysisRoutes } from "../modules/analysis/analysis.routes.js";
import { attributionRoutes } from "../modules/attribution/attribution.routes.js";
import seededCase from "../../datasets/seeded-case.json" with { type: "json" };
import defaultAddressLabels from "../../datasets/address-labels.json" with {
  type: "json",
};
import type {
  NormalizedTransaction,
  NormalizedTransactionInput,
  AddressLabel,
  AnalysisResponse,
  RiskFinding,
  GraphNode,
  GraphEdge,
} from "@sih/shared-types";

test("Demo Safety Net: Full seeded end-to-end pipeline runs with zero external calls", async () => {
  const caseId = "case_demo_safety_net_001";
  const rootAddress = "0x9999999999999999999999999999999999999999";
  const chainId = 1;

  // In-memory data store for pure isolation and zero external DB/network calls
  const db: {
    cases: Record<string, any>;
    transactions: NormalizedTransaction[];
    nodes: GraphNode[];
    edges: GraphEdge[];
    findings: RiskFinding[];
    analysisResults: any[];
    reports: any[];
    evidenceRecords: any[];
  } = {
    cases: {},
    transactions: [],
    nodes: [],
    edges: [],
    findings: [],
    analysisResults: [],
    reports: [],
    evidenceRecords: [],
  };

  // Mock Prisma client mapping directly to in-memory tables
  const mockPrisma: any = {
    case: {
      create: async ({ data }: any) => {
        db.cases[data.id] = {
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        return db.cases[data.id];
      },
      findUnique: async ({ where, include }: any) => {
        const c = db.cases[where.id];
        if (!c) return null;
        if (!include) return c;
        return {
          ...c,
          ...(include.transactions && {
            transactions: db.transactions
              .filter((t) => t.caseId === where.id)
              .map((t) => ({ ...t, timestamp: new Date(t.timestamp) })),
          }),
          ...(include.graphNodes && {
            graphNodes: db.nodes
              .filter((n) => n.caseId === where.id)
              .map((n) => ({
                ...n,
                labelsJson: JSON.stringify(n.labels),
                createdAt: new Date(n.createdAt),
              })),
          }),
          ...(include.graphEdges && {
            graphEdges: db.edges
              .filter((e) => e.caseId === where.id)
              .map((e) => ({
                ...e,
                timestamp: new Date(e.timestamp),
                createdAt: new Date(e.createdAt),
              })),
          }),
          ...(include.riskFindings && {
            riskFindings: db.findings
              .filter((f) => f.caseId === where.id)
              .map((f) => ({
                ...f,
                relatedNodeIdsJson: JSON.stringify(f.relatedNodeIds),
                relatedEdgeIdsJson: JSON.stringify(f.relatedEdgeIds),
                signalsJson: JSON.stringify(f.signals),
                createdAt: new Date(f.createdAt),
              })),
          }),
        };
      },
      update: async ({ where, data }: any) => {
        if (!db.cases[where.id]) throw new Error("Case not found");
        db.cases[where.id] = {
          ...db.cases[where.id],
          updatedAt: new Date(),
          ...data,
        };
        return db.cases[where.id];
      },
    },
    transaction: {
      findMany: async ({ where }: any) => {
        return db.transactions.filter((t) => t.caseId === where.caseId);
      },
    },
    graphNode: {
      findMany: async ({ where }: any) => {
        return db.nodes.filter((n) => n.caseId === where.caseId);
      },
    },
    graphEdge: {
      findMany: async ({ where }: any) => {
        return db.edges.filter((e) => e.caseId === where.caseId);
      },
    },
    riskFinding: {
      findMany: async ({ where }: any) => {
        return db.findings.filter((f) => f.caseId === where.caseId);
      },
    },
    analysisResult: {
      findFirst: async ({ where }: any) => {
        const results = db.analysisResults.filter((a) => a.caseId === where.caseId);
        return results[results.length - 1] ?? null;
      },
      create: async ({ data }: any) => {
        const row = { id: `ar_${db.analysisResults.length + 1}`, createdAt: new Date(), ...data };
        db.analysisResults.push(row);
        return row;
      },
    },
    report: {
      count: async ({ where }: any) => {
        return db.reports.filter((r) => r.caseId === where.caseId).length;
      },
      create: async ({ data }: any) => {
        const row = { id: `rep_${db.reports.length + 1}`, generatedAt: new Date(), ...data };
        db.reports.push(row);
        return row;
      },
      findFirst: async ({ where }: any) => {
        return (
          db.reports.find(
            (r) => r.id === where.id && (!where.caseId || r.caseId === where.caseId)
          ) ?? null
        );
      },
      findMany: async ({ where }: any) => {
        return db.reports.filter((r) => r.caseId === where.caseId);
      },
    },
    evidenceRecord: {
      count: async ({ where }: any) => {
        return db.evidenceRecords.filter((e) => e.caseId === where.caseId).length;
      },
      create: async ({ data }: any) => {
        const row = { id: `ev_${db.evidenceRecords.length + 1}`, ...data };
        db.evidenceRecords.push(row);
        return row;
      },
      findFirst: async ({ where }: any) => {
        return (
          db.evidenceRecords.find(
            (e) =>
              e.caseId === where.caseId &&
              (!where.reportId || e.reportId === where.reportId)
          ) ?? null
        );
      },
      findMany: async ({ where }: any) => {
        return db.evidenceRecords.filter((e) => e.caseId === where.caseId);
      },
    },
  };

  const app = Fastify();
  app.decorate("prisma", mockPrisma);
  app.decorate("config", {
    PORT: 3000,
    DATABASE_URL: "postgresql://localhost/mock",
    REDIS_URL: "redis://localhost/mock",
    ALCHEMY_API_URL: "http://localhost:8545",
    INTELLIGENCE_API_URL: "http://localhost:8000",
  } as any);

  await app.register(evidenceRoutes);
  await app.register(analysisRoutes);
  await app.register(attributionRoutes);
  await app.ready();

  // ───────────────────────────────────────────────────────────────────────────
  // STEP 1: Case Created in Demo Mode
  // ───────────────────────────────────────────────────────────────────────────
  await mockPrisma.case.create({
    data: {
      id: caseId,
      name: "Demo Safety Net Case",
      rootAddress,
      chainId,
      mode: "demo",
      status: "created",
    },
  });

  let currentCase = await mockPrisma.case.findUnique({ where: { id: caseId } });
  assert.equal(currentCase.status, "created");

  // Query analysis and attribution before analysis has run -> should return 200 pending
  const preAnalysisRes = await app.inject({
    method: "GET",
    url: `/cases/${caseId}/analysis`,
  });
  assert.equal(preAnalysisRes.statusCode, 200);
  const preAnalysisJson = JSON.parse(preAnalysisRes.payload);
  assert.equal(preAnalysisJson.status, "pending");
  assert.equal(preAnalysisJson.analysis, null);

  const preAttributionRes = await app.inject({
    method: "GET",
    url: `/cases/${caseId}/attribution`,
  });
  assert.equal(preAttributionRes.statusCode, 200);
  const preAttributionJson = JSON.parse(preAttributionRes.payload);
  assert.equal(preAttributionJson.status, "pending");
  assert.equal(preAttributionJson.attribution, null);

  // ───────────────────────────────────────────────────────────────────────────
  // STEP 2: Demo Ingestion & Seeded Fallback Trigger
  // ───────────────────────────────────────────────────────────────────────────
  const seededRawTransactions = (seededCase as any).transactions ?? [];
  const seededRoot = (seededCase as any).case?.rootAddress ?? "";

  const remappedTransactions: NormalizedTransaction[] = seededRawTransactions.map(
    (tx: any, idx: number) => ({
      ...tx,
      id: `tx_${idx + 1}`,
      caseId,
      chainId,
      rawProviderRef: tx.rawProviderRef ?? null,
      from: seededRoot && tx.from === seededRoot ? rootAddress : tx.from,
      to: seededRoot && tx.to === seededRoot ? rootAddress : tx.to,
    })
  );

  db.transactions.push(...remappedTransactions);
  await mockPrisma.case.update({
    where: { id: caseId },
    data: { status: "demo_fallback_used" },
  });

  currentCase = await mockPrisma.case.findUnique({ where: { id: caseId } });
  assert.equal(currentCase.status, "demo_fallback_used");
  assert.ok(db.transactions.length > 0, "Transactions populated from seeded dataset");

  // ───────────────────────────────────────────────────────────────────────────
  // STEP 3: Graph Building & Risk Detectors -> graph_ready
  // ───────────────────────────────────────────────────────────────────────────
  const addressLabels = defaultAddressLabels as AddressLabel[];
  const { nodes, edges } = await buildGraph({
    caseId,
    rootAddress,
    transactions: db.transactions,
    addressLabels,
  });

  const findings = runRiskDetectors({
    caseId,
    rootAddress,
    nodes,
    edges,
    transactions: db.transactions,
    addressLabels,
  });

  const { riskScore, riskLevel } = calculateRiskScore(findings);

  db.nodes.push(...nodes);
  db.edges.push(...edges);
  db.findings.push(...findings);

  await mockPrisma.case.update({
    where: { id: caseId },
    data: {
      status: "graph_ready",
      riskScore,
      riskLevel,
    },
  });

  currentCase = await mockPrisma.case.findUnique({ where: { id: caseId } });
  assert.equal(currentCase.status, "graph_ready");
  assert.ok(db.nodes.length > 0, "Graph nodes built");
  assert.ok(db.edges.length > 0, "Graph edges built");
  assert.ok(db.findings.length > 0, "Risk findings detected");

  // ───────────────────────────────────────────────────────────────────────────
  // STEP 4: Analysis Engine Execution -> analyzed
  // ───────────────────────────────────────────────────────────────────────────
  const rawAnalysisRequest = {
    caseId,
    analysisRequestId: "req_demo_001",
    rootAddress,
    minConfidence: 0.3,
    decayFactor: 0.85,
    hardCeilingDepth: 10,
    nodes: db.nodes,
    edges: db.edges,
    transactions: db.transactions,
    basicFindings: db.findings,
  };

  const validatedReq = validatePreAnalysisRequest(rawAnalysisRequest);
  assert.ok(validatedReq);

  // Fixture response referencing actual node and edge IDs from graph
  const fixtureAnalysisResponse: AnalysisResponse = {
    analysisId: "an_demo_001",
    caseId,
    riskScore: 88,
    riskLevel: "critical",
    suspiciousPaths: [
      {
        id: "path_01",
        rank: 1,
        score: 95,
        nodeIds: [db.nodes[0].id, db.nodes[1].id],
        edgeIds: [db.edges[0].id],
        reasonCodes: ["direct_deposit"],
        summary: "Direct deposit path to VASP",
      },
    ],
    circularFlows: [],
    vaspAttribution: {
      attributedVasp: "Binance",
      vaspNodeId: db.nodes[1].id,
      hopDistance: 1,
      confidence: 0.9,
      pathNodeIds: [db.nodes[0].id, db.nodes[1].id],
      pathEdgeIds: [db.edges[0].id],
      basis: "Direct exposure within 1 hop",
      secondaryCandidates: [],
    },
    findings: [
      {
        id: "finding_ai_01",
        caseId,
        source: "python-intelligence",
        type: "mixer_interaction",
        severity: "critical",
        confidence: 0.95,
        title: "AI Detected High Risk Infiltration",
        description: "Funds moved to high-risk destination",
        relatedNodeIds: [db.nodes[0].id],
        relatedEdgeIds: [db.edges[0].id],
        signals: ["demo_signal"],
        createdAt: new Date().toISOString(),
      },
    ],
    analysisMetadata: {
      engineVersion: "1.0.0-demo",
      runtimeMs: 12,
    },
  };

  const sentGraph = {
    caseId,
    nodeIds: db.nodes.map((n) => n.id),
    edgeIds: db.edges.map((e) => e.id),
  };
  const validatedResponse = validateAnalysisResponse(fixtureAnalysisResponse, sentGraph);

  await mockPrisma.analysisResult.create({
    data: {
      caseId,
      analysisRequestId: validatedReq.analysisRequestId,
      riskScore: validatedResponse.riskScore,
      riskLevel: validatedResponse.riskLevel,
      suspiciousPathsJson: JSON.stringify(validatedResponse.suspiciousPaths),
      circularFlowsJson: JSON.stringify(validatedResponse.circularFlows),
      attributedVaspJson: JSON.stringify(validatedResponse.vaspAttribution),
      metadataJson: JSON.stringify(validatedResponse.analysisMetadata),
    },
  });

  await mockPrisma.case.update({
    where: { id: caseId },
    data: {
      status: "analyzed",
      riskScore: validatedResponse.riskScore,
      riskLevel: validatedResponse.riskLevel,
    },
  });

  currentCase = await mockPrisma.case.findUnique({ where: { id: caseId } });
  assert.equal(currentCase.status, "analyzed");

  // Query analysis and attribution now that analysis is complete
  const postAnalysisRes = await app.inject({
    method: "GET",
    url: `/cases/${caseId}/analysis`,
  });
  assert.equal(postAnalysisRes.statusCode, 200);
  const postAnalysisJson = JSON.parse(postAnalysisRes.payload);
  assert.equal(postAnalysisJson.status, "complete");
  assert.equal(postAnalysisJson.analysis.riskScore, 88);

  const postAttributionRes = await app.inject({
    method: "GET",
    url: `/cases/${caseId}/attribution`,
  });
  assert.equal(postAttributionRes.statusCode, 200);
  const postAttributionJson = JSON.parse(postAttributionRes.payload);
  assert.equal(postAttributionJson.status, "complete");
  assert.equal(postAttributionJson.attribution.attributedVasp, "Binance");

  // ───────────────────────────────────────────────────────────────────────────
  // STEP 5: Report Generation -> Report status: generated, Case.status: analyzed
  // ───────────────────────────────────────────────────────────────────────────
  const pdfBuffer = await generateReportPdf(caseId, mockPrisma);
  assert.ok(pdfBuffer instanceof Buffer);
  assert.ok(pdfBuffer.length > 0);

  const sha256Hash = hashBuffer(pdfBuffer);
  assert.ok(sha256Hash.startsWith("0x"));
  assert.equal(sha256Hash.length, 66);

  const createdReport = await mockPrisma.report.create({
    data: {
      caseId,
      status: "generated",
      filePath: `storage/reports/${caseId}-v1.pdf`,
      sha256Hash,
      version: 1,
    },
  });

  assert.equal(createdReport.status, "generated");

  // CRITICAL CHECK: Case.status must remain "analyzed" after report generation!
  currentCase = await mockPrisma.case.findUnique({ where: { id: caseId } });
  assert.equal(
    currentCase.status,
    "analyzed",
    "Case.status must remain 'analyzed' after report generation"
  );

  // ───────────────────────────────────────────────────────────────────────────
  // STEP 6: Evidence Storage Attempted (storage_failed without live credentials)
  // ───────────────────────────────────────────────────────────────────────────
  const evidenceStoreRes = await app.inject({
    method: "POST",
    url: `/cases/${caseId}/evidence`,
    payload: {
      reportId: createdReport.id,
    },
  });

  assert.equal(evidenceStoreRes.statusCode, 200);
  const evidenceStoreJson = JSON.parse(evidenceStoreRes.payload);
  assert.equal(evidenceStoreJson.evidenceRecord.verificationStatus, "storage_failed");
  assert.equal(evidenceStoreJson.evidenceRecord.reportHash, sha256Hash);

  // ───────────────────────────────────────────────────────────────────────────
  // STEP 7: Evidence Verification Attempted (returns verified: false cleanly)
  // ───────────────────────────────────────────────────────────────────────────
  const verifyRes = await app.inject({
    method: "POST",
    url: "/evidence/verify",
    payload: {
      caseId,
      reportId: createdReport.id,
    },
  });

  assert.equal(verifyRes.statusCode, 200);
  const verifyJson = JSON.parse(verifyRes.payload);
  assert.equal(verifyJson.caseId, caseId);
  assert.equal(verifyJson.reportId, createdReport.id);
  assert.equal(verifyJson.computedHash, sha256Hash);
  assert.equal(verifyJson.onChainHash, null);
  assert.equal(verifyJson.verified, false);
  assert.equal(
    verifyJson.reason,
    "no evidence stored on-chain for this report",
    "Should report graceful reason without crashing or making external network calls"
  );

  await app.close();
});
