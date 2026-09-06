import test from "node:test";
import assert from "node:assert/strict";
import { detectVaspDirectTouch } from "./vaspDirectTouch.detector.js";
import type { DetectorInput } from "./fanOut.detector.js";

test("VASP Direct Touch Detector - flags VASP node within 1-2 hops with exact output shape", () => {
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
        id: "wallet:0x4444444444444444444444444444444444444444",
        caseId: "case_123",
        address: "0x4444444444444444444444444444444444444444",
        type: "vasp",
        labels: ["vasp", "binance deposit"],
        riskLevel: null,
        totalInUsd: 900,
        totalOutUsd: 0,
        isTraceableDeadEnd: true,
        outDegree: 0,
        createdAt: "2026-08-21T10:00:00.000Z",
      },
    ],
    edges: [
      {
        id: "edge:0xghi0000000000000000000000000000000000000000000000000000000000000:0",
        caseId: "case_123",
        fromNodeId: "wallet:0x1111111111111111111111111111111111111111",
        toNodeId: "wallet:0x4444444444444444444444444444444444444444",
        from: "wallet:0x1111111111111111111111111111111111111111",
        to: "wallet:0x4444444444444444444444444444444444444444",
        transactionHash: "0xghi0000000000000000000000000000000000000000000000000000000000000",
        asset: "USDT",
        amount: "900",
        amountUsd: 900,
        timestamp: "2026-08-21T10:05:00.000Z",
        hopDepth: 1,
        riskLevel: "low",
        createdAt: "2026-08-21T10:00:00.000Z",
      },
    ],
    transactions: [
      {
        id: "tx_001",
        caseId: "case_123",
        hash: "0xghi0000000000000000000000000000000000000000000000000000000000000",
        chainId: 1,
        blockNumber: 15000000,
        from: "0x1111111111111111111111111111111111111111",
        to: "0x4444444444444444444444444444444444444444",
        asset: "USDT",
        tokenAddress: null,
        amount: "900",
        amountUsd: 900,
        timestamp: "2026-08-21T10:05:00.000Z",
        transferType: "erc20",
      },
    ],
    addressLabels: [
      {
        address: "0x4444444444444444444444444444444444444444",
        type: "vasp",
        label: "Binance Deposit",
        chainId: 1,
      },
    ],
  };

  const findings = detectVaspDirectTouch(fixture);

  assert.equal(findings.length, 1);
  const finding = findings[0];

  assert.equal(finding.caseId, "case_123");
  assert.equal(finding.source, "basic-risk");
  assert.equal(finding.type, "vasp_direct_touch");
  assert.equal(finding.severity, "info");
  assert.equal(finding.confidence, 0.85);
  assert.equal(finding.title, "Direct VASP contact detected");
  assert.equal(
    finding.description,
    "Wallet transacted directly with a labeled VASP deposit address."
  );
  assert.deepEqual(finding.signals, ["labeled_vasp_address", "hop_distance_1"]);
  assert.ok(finding.relatedNodeIds.includes("wallet:0x4444444444444444444444444444444444444444"));
  assert.ok(finding.relatedEdgeIds.includes("edge:0xghi0000000000000000000000000000000000000000000000000000000000000:0"));
});
