import test from "node:test";
import assert from "node:assert/strict";
import { detectMixerInteractions } from "./mixer.detector.js";
import type { DetectorInput } from "./fanOut.detector.js";

test("Mixer Interaction Detector - flags mixer node with exact output shape", () => {
  const fixture: DetectorInput = {
    caseId: "case_123",
    rootAddress: "0x1111111111111111111111111111111111111111",
    nodes: [
      {
        id: "wallet:0x1111111111111111111111111111111111111111",
        caseId: "case_123",
        address: "0x1111111111111111111111111111111111111111",
        type: "wallet",
        labels: ["root"],
        riskLevel: "medium",
        totalInUsd: 1200,
        totalOutUsd: 900,
        isTraceableDeadEnd: false,
        outDegree: 1,
        createdAt: "2026-08-21T10:00:00.000Z",
      },
      {
        id: "mixer:0x3333333333333333333333333333333333333333",
        caseId: "case_123",
        address: "0x3333333333333333333333333333333333333333",
        type: "mixer",
        labels: ["mixer", "tornado cash eth 0.1"],
        riskLevel: "high",
        totalInUsd: 900,
        totalOutUsd: 0,
        isTraceableDeadEnd: true,
        outDegree: 0,
        createdAt: "2026-08-21T10:00:00.000Z",
      },
    ],
    edges: [
      {
        id: "edge:0xdef0000000000000000000000000000000000000000000000000000000000000:0",
        caseId: "case_123",
        fromNodeId: "wallet:0x1111111111111111111111111111111111111111",
        toNodeId: "mixer:0x3333333333333333333333333333333333333333",
        from: "wallet:0x1111111111111111111111111111111111111111",
        to: "mixer:0x3333333333333333333333333333333333333333",
        transactionHash: "0xdef0000000000000000000000000000000000000000000000000000000000000",
        asset: "ETH",
        amount: "0.1",
        amountUsd: 300,
        timestamp: "2026-08-21T10:05:00.000Z",
        hopDepth: 1,
        riskLevel: "high",
        createdAt: "2026-08-21T10:00:00.000Z",
      },
    ],
    transactions: [
      {
        id: "tx_001",
        caseId: "case_123",
        hash: "0xdef0000000000000000000000000000000000000000000000000000000000000",
        chainId: 1,
        blockNumber: 15000000,
        from: "0x1111111111111111111111111111111111111111",
        to: "0x3333333333333333333333333333333333333333",
        asset: "ETH",
        tokenAddress: null,
        amount: "0.1",
        amountUsd: 300,
        timestamp: "2026-08-21T10:05:00.000Z",
        transferType: "native",
      },
    ],
    addressLabels: [
      {
        address: "0x3333333333333333333333333333333333333333",
        type: "mixer",
        label: "Tornado Cash ETH 0.1",
        chainId: 1,
      },
    ],
  };

  const findings = detectMixerInteractions(fixture);

  assert.equal(findings.length, 1);
  const finding = findings[0];

  assert.equal(finding.caseId, "case_123");
  assert.equal(finding.source, "basic-risk");
  assert.equal(finding.type, "mixer_interaction");
  assert.equal(finding.severity, "critical");
  assert.equal(finding.confidence, 0.95);
  assert.equal(finding.title, "Funds routed through known mixer");
  assert.equal(
    finding.description,
    "Wallet deposited into a labeled mixing service. On-chain trail ends here; further tracing requires off-chain/legal process."
  );
  assert.deepEqual(finding.signals, ["known_mixer_address"]);
  assert.ok(finding.relatedNodeIds.includes("mixer:0x3333333333333333333333333333333333333333"));
  assert.ok(finding.relatedEdgeIds.includes("edge:0xdef0000000000000000000000000000000000000000000000000000000000000:0"));
});
