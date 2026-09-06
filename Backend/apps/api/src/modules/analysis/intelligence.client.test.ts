import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeCase,
  IntelligenceClientError,
} from "./intelligence.client.js";
import type {
  AnalysisRequest,
  AnalysisResponse,
} from "@sih/shared-types";

const mockRequest: AnalysisRequest = {
  caseId: "case-mock-123",
  analysisRequestId: "req-mock-456",
  rootAddress: "0x1111111111111111111111111111111111111111",
  minConfidence: 0.3,
  decayFactor: 0.85,
  hardCeilingDepth: 10,
  nodes: [
    {
      id: "wallet:0x1111111111111111111111111111111111111111",
      caseId: "case-mock-123",
      address: "0x1111111111111111111111111111111111111111",
      type: "wallet",
      labels: ["root"],
      riskLevel: "medium",
      totalInUsd: 1200,
      totalOutUsd: 900,
      isTraceableDeadEnd: false,
      outDegree: 3,
      createdAt: new Date().toISOString(),
    },
  ],
  edges: [],
  transactions: [],
  basicFindings: [],
};

const mockResponseFixture: AnalysisResponse = {
  analysisId: "analysis-res-789",
  caseId: "case-mock-123",
  riskScore: 78,
  riskLevel: "high",
  findings: [
    {
      id: "finding-adv-1",
      caseId: "case-mock-123",
      source: "python-intelligence",
      type: "rapid_dispersion",
      severity: "high",
      confidence: 0.92,
      title: "Rapid fund dispersion observed",
      description: "Funds moved across 3 hops in less than 5 minutes.",
      relatedNodeIds: ["wallet:0x1111111111111111111111111111111111111111"],
      relatedEdgeIds: [],
      signals: ["high_velocity", "multi_hop"],
      createdAt: new Date().toISOString(),
    },
  ],
  suspiciousPaths: [
    {
      id: "path-1",
      rank: 1,
      score: 85,
      nodeIds: ["wallet:0x1111111111111111111111111111111111111111"],
      edgeIds: [],
      reasonCodes: ["FAST_LAYER"],
      summary: "Direct path to flagged intermediary",
    },
  ],
  circularFlows: [],
  vaspAttribution: {
    attributedVasp: "Binance",
    vaspNodeId: "wallet:0x28c6c06298d514db089934071355e5743bf21d60",
    hopDistance: 2,
    confidence: 0.88,
    pathNodeIds: ["wallet:0x111", "wallet:0x222", "wallet:0x28c6c06298d514db089934071355e5743bf21d60"],
    pathEdgeIds: ["edge-1", "edge-2"],
    basis: "Shortest hop distance (2 hops) with high volume (95% of egress)",
    secondaryCandidates: [],
  },
  analysisMetadata: {
    engineVersion: "1.0.0",
    runtimeMs: 42,
  },
};

test("intelligence client: parses successful response from mocked server/fixture", async () => {
  // Mock global fetch to return fixture
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    assert.equal(String(url), "http://localhost:8000/v1/analyze");
    assert.equal(init?.method, "POST");
    return new Response(JSON.stringify(mockResponseFixture), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const result = await analyzeCase(mockRequest, "http://localhost:8000");
    assert.equal(result.analysisId, "analysis-res-789");
    assert.equal(result.riskScore, 78);
    assert.equal(result.riskLevel, "high");
    assert.equal(result.findings.length, 1);
    assert.equal(result.suspiciousPaths.length, 1);
    assert.equal(result.vaspAttribution?.attributedVasp, "Binance");
    assert.equal(result.vaspAttribution?.confidence, 0.88);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("intelligence client: handles 4xx non-retryable error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    return new Response("Invalid payload", { status: 400, statusText: "Bad Request" });
  }) as typeof fetch;

  try {
    await assert.rejects(
      async () => {
        await analyzeCase(mockRequest, "http://localhost:8000");
      },
      (err: Error) => {
        assert(err instanceof IntelligenceClientError);
        assert.equal(err.statusCode, 400);
        assert.equal(err.isRetryable, false);
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("intelligence client: handles 5xx retryable error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    return new Response("Internal Server Error", { status: 503, statusText: "Service Unavailable" });
  }) as typeof fetch;

  try {
    await assert.rejects(
      async () => {
        await analyzeCase(mockRequest, "http://localhost:8000");
      },
      (err: Error) => {
        assert(err instanceof IntelligenceClientError);
        assert.equal(err.statusCode, 503);
        assert.equal(err.isRetryable, true);
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
