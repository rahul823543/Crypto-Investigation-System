import test from "node:test";
import assert from "node:assert/strict";
import {
  analysisRequestSchema,
  validatePreAnalysisRequest,
  validateAnalysisResponse,
  AnalysisResponseValidationError,
} from "./analysis.validation.js";

// ─── Request validation fixtures ─────────────────────────────────────────────

const NODE_A = "wallet:0x1111111111111111111111111111111111111111";
const NODE_B = "wallet:0x2222222222222222222222222222222222222222";
const EDGE_1 = "edge-1";

const validPayload = {
  caseId: "case-123",
  analysisRequestId: "req-456",
  rootAddress: "0x1111111111111111111111111111111111111111",
  minConfidence: 0.5,
  decayFactor: 0.9,
  hardCeilingDepth: 10,
  nodes: [
    {
      id: NODE_A,
      caseId: "case-123",
      address: "0x1111111111111111111111111111111111111111",
      type: "wallet",
      labels: ["root"],
      riskLevel: "medium",
      totalInUsd: 1000,
      totalOutUsd: 500,
      isTraceableDeadEnd: false,
      outDegree: 1,
      createdAt: new Date().toISOString(),
    },
    {
      id: NODE_B,
      caseId: "case-123",
      address: "0x2222222222222222222222222222222222222222",
      type: "wallet",
      labels: [],
      riskLevel: null,
      totalInUsd: 500,
      totalOutUsd: 0,
      isTraceableDeadEnd: false,
      outDegree: 0,
      createdAt: new Date().toISOString(),
    },
  ],
  edges: [
    {
      id: EDGE_1,
      caseId: "case-123",
      fromNodeId: NODE_A,
      toNodeId: NODE_B,
      transactionHash: "0xabc",
      asset: "ETH",
      amount: "1.0",
      amountUsd: 2500,
      timestamp: new Date().toISOString(),
      hopDepth: 1,
      riskLevel: null,
      createdAt: new Date().toISOString(),
    },
  ],
  transactions: [],
  basicFindings: [],
};

const sentGraph = {
  caseId: "case-123",
  nodeIds: [NODE_A, NODE_B],
  edgeIds: [EDGE_1],
};

// ─── Request validation tests ─────────────────────────────────────────────────

test("analysis.validation [request]: passes valid payload", () => {
  const result = validatePreAnalysisRequest(validPayload);
  assert.equal(result.caseId, "case-123");
  assert.equal(result.minConfidence, 0.5);
  assert.equal(result.decayFactor, 0.9);
  assert.equal(result.hardCeilingDepth, 10);
});

test("analysis.validation [request]: rejects invalid root address", () => {
  assert.throws(
    () => validatePreAnalysisRequest({ ...validPayload, rootAddress: "0xinvalid" }),
    /rootAddress/
  );
});

test("analysis.validation [request]: rejects minConfidence out of range", () => {
  assert.throws(
    () => validatePreAnalysisRequest({ ...validPayload, minConfidence: -0.1 }),
    /minConfidence/
  );
  assert.throws(
    () => validatePreAnalysisRequest({ ...validPayload, minConfidence: 1.5 }),
    /minConfidence/
  );
});

test("analysis.validation [request]: rejects decayFactor out of range", () => {
  assert.throws(
    () => validatePreAnalysisRequest({ ...validPayload, decayFactor: -0.1 }),
    /decayFactor/
  );
  assert.throws(
    () => validatePreAnalysisRequest({ ...validPayload, decayFactor: 1.1 }),
    /decayFactor/
  );
});

test("analysis.validation [request]: rejects hardCeilingDepth <= 0", () => {
  assert.throws(
    () => validatePreAnalysisRequest({ ...validPayload, hardCeilingDepth: 0 }),
    /hardCeilingDepth/
  );
  assert.throws(
    () => validatePreAnalysisRequest({ ...validPayload, hardCeilingDepth: -5 }),
    /hardCeilingDepth/
  );
});

test("analysis.validation [request]: rejects dangling edge not matching node IDs", () => {
  const danglingEdgePayload = {
    ...validPayload,
    edges: [
      {
        ...validPayload.edges[0],
        toNodeId: "wallet:0x9999999999999999999999999999999999999999",
      },
    ],
  };

  assert.throws(
    () => validatePreAnalysisRequest(danglingEdgePayload),
    /not found in nodes list/
  );
});

// ─── Response validation tests ────────────────────────────────────────────────

const validResponse = {
  analysisId: "analysis-1",
  caseId: "case-123",
  riskScore: 75,
  riskLevel: "high",
  findings: [
    {
      id: "f-1",
      caseId: "case-123",
      source: "python-intelligence",
      type: "rapid_dispersion",
      severity: "high",
      confidence: 0.9,
      title: "Rapid dispersion",
      description: "Funds moved quickly",
      relatedNodeIds: [NODE_A],
      relatedEdgeIds: [EDGE_1],
      signals: ["velocity"],
      createdAt: new Date().toISOString(),
    },
  ],
  suspiciousPaths: [
    {
      id: "path-1",
      rank: 1,
      score: 85,
      nodeIds: [NODE_A, NODE_B],
      edgeIds: [EDGE_1],
      reasonCodes: ["FAST"],
      summary: "Quick transfer",
    },
  ],
  circularFlows: [],
  vaspAttribution: {
    attributedVasp: "Binance",
    vaspNodeId: NODE_B,
    hopDistance: 1,
    confidence: 0.88,
    pathNodeIds: [NODE_A, NODE_B],
    pathEdgeIds: [EDGE_1],
    basis: "Shortest hop",
    secondaryCandidates: [],
  },
  analysisMetadata: {
    engineVersion: "1.0.0",
    runtimeMs: 42,
  },
};

test("analysis.validation [response]: passes valid response", () => {
  const result = validateAnalysisResponse(validResponse, sentGraph);
  assert.equal(result.caseId, "case-123");
  assert.equal(result.riskScore, 75);
});

test("analysis.validation [response]: rejects caseId mismatch", () => {
  assert.throws(
    () =>
      validateAnalysisResponse(
        { ...validResponse, caseId: "case-WRONG" },
        sentGraph
      ),
    (err: Error) => {
      assert(err instanceof AnalysisResponseValidationError);
      assert.match(err.message, /caseId mismatch/);
      return true;
    }
  );
});

test("analysis.validation [response]: rejects riskScore out of range", () => {
  assert.throws(
    () =>
      validateAnalysisResponse({ ...validResponse, riskScore: 150 }, sentGraph),
    (err: Error) => {
      assert(err instanceof AnalysisResponseValidationError);
      assert.match(err.message, /riskScore/);
      return true;
    }
  );
});

test("analysis.validation [response]: rejects invalid riskLevel", () => {
  assert.throws(
    () =>
      validateAnalysisResponse(
        { ...validResponse, riskLevel: "catastrophic" },
        sentGraph
      ),
    (err: Error) => {
      assert(err instanceof AnalysisResponseValidationError);
      assert.match(err.message, /riskLevel/);
      return true;
    }
  );
});

test("analysis.validation [response]: rejects finding referencing unknown nodeId", () => {
  const badResponse = {
    ...validResponse,
    findings: [
      { ...validResponse.findings[0], relatedNodeIds: ["wallet:UNKNOWN"] },
    ],
  };
  assert.throws(
    () => validateAnalysisResponse(badResponse, sentGraph),
    (err: Error) => {
      assert(err instanceof AnalysisResponseValidationError);
      assert.match(err.message, /findings\[0\]\.relatedNodeIds/);
      assert.match(err.message, /wallet:UNKNOWN/);
      return true;
    }
  );
});

test("analysis.validation [response]: rejects suspiciousPath with unknown edgeId", () => {
  const badResponse = {
    ...validResponse,
    suspiciousPaths: [
      { ...validResponse.suspiciousPaths[0], edgeIds: ["edge-BOGUS"] },
    ],
  };
  assert.throws(
    () => validateAnalysisResponse(badResponse, sentGraph),
    (err: Error) => {
      assert(err instanceof AnalysisResponseValidationError);
      assert.match(err.message, /suspiciousPaths\[0\]\.edgeIds/);
      assert.match(err.message, /edge-BOGUS/);
      return true;
    }
  );
});

test("analysis.validation [response]: rejects vaspAttribution with unknown vaspNodeId", () => {
  const badResponse = {
    ...validResponse,
    vaspAttribution: {
      ...validResponse.vaspAttribution,
      vaspNodeId: "wallet:GHOST",
    },
  };
  assert.throws(
    () => validateAnalysisResponse(badResponse, sentGraph),
    (err: Error) => {
      assert(err instanceof AnalysisResponseValidationError);
      assert.match(err.message, /vaspAttribution\.vaspNodeId/);
      assert.match(err.message, /wallet:GHOST/);
      return true;
    }
  );
});

test("analysis.validation [response]: rejects missing/empty engineVersion", () => {
  const badResponse = {
    ...validResponse,
    analysisMetadata: { ...validResponse.analysisMetadata, engineVersion: "" },
  };
  assert.throws(
    () => validateAnalysisResponse(badResponse, sentGraph),
    (err: Error) => {
      assert(err instanceof AnalysisResponseValidationError);
      assert.match(err.message, /engineVersion/);
      return true;
    }
  );
});

test("analysis.validation [response]: passes with null vaspAttribution", () => {
  const result = validateAnalysisResponse(
    { ...validResponse, vaspAttribution: null },
    sentGraph
  );
  assert.equal(result.vaspAttribution, null);
});
