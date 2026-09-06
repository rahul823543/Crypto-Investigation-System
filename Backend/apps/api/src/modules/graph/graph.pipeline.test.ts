import test from "node:test";
import assert from "node:assert/strict";
import { buildGraph } from "./graph.builder.js";
import { runRiskDetectors } from "../risk/risk.detector.js";
import { calculateRiskScore } from "../risk/riskScore.js";
import type { NormalizedTransaction, AddressLabel } from "@sih/shared-types";

test("Full Build-Case-Graph Pipeline — Mixer and VASP integration verification", async () => {
  const caseId = "case_verify_phase3_v3";
  const rootAddress = "0x1111111111111111111111111111111111111111";
  const mixerAddress = "0x12d66f87a04a9e220c9d0f580b4acbe395e01a7f"; // Tornado Cash
  const vaspAddress = "0x28c6c06298d514db089934071355e5743bf21d60"; // Binance Deposit
  const ordinaryWallet = "0x5555555555555555555555555555555555555555";
  const dexAddress = "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff"; // QuickSwap

  const transactions: NormalizedTransaction[] = [
    // Root sends funds to mixer (hop 1)
    {
      id: "tx_01",
      caseId,
      hash: "0xaaa0000000000000000000000000000000000000000000000000000000000001",
      chainId: 1,
      blockNumber: 1000001,
      from: rootAddress,
      to: mixerAddress,
      asset: "ETH",
      tokenAddress: null,
      amount: "1.0",
      amountUsd: 2500,
      timestamp: "2026-08-21T10:00:00.000Z",
      transferType: "native",
    },
    // Root sends funds to ordinary wallet (hop 1)
    {
      id: "tx_02",
      caseId,
      hash: "0xaaa000000000000000000000000000000000000000000000000000000000002",
      chainId: 1,
      blockNumber: 1000002,
      from: rootAddress,
      to: ordinaryWallet,
      asset: "USDT",
      tokenAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7",
      amount: "5000",
      amountUsd: 5000,
      timestamp: "2026-08-21T10:05:00.000Z",
      transferType: "erc20",
    },
    // Ordinary wallet deposits into VASP (hop 2 from root)
    {
      id: "tx_03",
      caseId,
      hash: "0xaaa000000000000000000000000000000000000000000000000000000000003",
      chainId: 1,
      blockNumber: 1000010,
      from: ordinaryWallet,
      to: vaspAddress,
      asset: "USDT",
      tokenAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7",
      amount: "4800",
      amountUsd: 4800,
      timestamp: "2026-08-21T10:15:00.000Z",
      transferType: "erc20",
    },
    // Root sends to DEX (hop 1)
    {
      id: "tx_04",
      caseId,
      hash: "0xaaa000000000000000000000000000000000000000000000000000000000004",
      chainId: 1,
      blockNumber: 1000020,
      from: rootAddress,
      to: dexAddress,
      asset: "USDC",
      tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      amount: "1000",
      amountUsd: 1000,
      timestamp: "2026-08-21T10:20:00.000Z",
      transferType: "erc20",
      method: "swapExactTokensForTokens",
    },
  ];

  // 1. Run buildGraph
  const { nodes, edges } = await buildGraph({
    caseId,
    rootAddress,
    transactions,
  });

  // Verify Graph Nodes
  const rootNode = nodes.find((n) => n.address.toLowerCase() === rootAddress.toLowerCase())!;
  const mixerNode = nodes.find((n) => n.address.toLowerCase() === mixerAddress.toLowerCase())!;
  const vaspNode = nodes.find((n) => n.address.toLowerCase() === vaspAddress.toLowerCase())!;
  const ordinaryNode = nodes.find((n) => n.address.toLowerCase() === ordinaryWallet.toLowerCase())!;
  const dexNode = nodes.find((n) => n.address.toLowerCase() === dexAddress.toLowerCase())!;

  assert.ok(rootNode, "Root node exists");
  assert.ok(mixerNode, "Mixer node exists");
  assert.ok(vaspNode, "VASP node exists");
  assert.ok(ordinaryNode, "Ordinary node exists");
  assert.ok(dexNode, "DEX node exists");

  // Verify isTraceableDeadEnd flags
  assert.equal(mixerNode.isTraceableDeadEnd, true, "Mixer node must be isTraceableDeadEnd: true");
  assert.equal(mixerNode.type, "mixer");

  assert.equal(vaspNode.isTraceableDeadEnd, true, "VASP node must be isTraceableDeadEnd: true");
  assert.equal(vaspNode.type, "vasp");

  assert.equal(ordinaryNode.isTraceableDeadEnd, false, "Ordinary wallet must be isTraceableDeadEnd: false");
  assert.equal(dexNode.isTraceableDeadEnd, false, "DEX router must be isTraceableDeadEnd: false");

  // Verify outDegrees
  assert.equal(rootNode.outDegree, 3, "Root outDegree should be 3");
  assert.equal(ordinaryNode.outDegree, 1, "Ordinary node outDegree should be 1");
  assert.equal(mixerNode.outDegree, 0, "Mixer outDegree should be 0");
  assert.equal(vaspNode.outDegree, 0, "VASP outDegree should be 0");

  // 2. Run risk detectors
  const findings = runRiskDetectors({
    caseId,
    rootAddress,
    nodes,
    edges,
    transactions,
  });

  // Verify mixer finding
  const mixerFinding = findings.find((f) => f.type === "mixer_interaction");
  assert.ok(mixerFinding, "mixer_interaction finding must exist");
  assert.equal(mixerFinding.severity, "critical");
  assert.equal(mixerFinding.confidence, 0.95);
  assert.equal(mixerFinding.title, "Funds routed through known mixer");
  assert.deepEqual(mixerFinding.signals, ["known_mixer_address"]);
  assert.ok(mixerFinding.relatedNodeIds.includes(mixerNode.id));

  // Verify VASP finding (at hop 2)
  const vaspFinding = findings.find((f) => f.type === "vasp_direct_touch");
  assert.ok(vaspFinding, "vasp_direct_touch finding must exist");
  assert.equal(vaspFinding.severity, "info");
  assert.equal(vaspFinding.confidence, 0.85);
  assert.equal(vaspFinding.title, "Direct VASP contact detected");
  assert.deepEqual(vaspFinding.signals, ["labeled_vasp_address", "hop_distance_2"]);
  assert.ok(vaspFinding.relatedNodeIds.includes(vaspNode.id));

  // 3. Test Risk Score Calculation
  const { riskScore, riskLevel } = calculateRiskScore(findings);
  assert.ok(riskScore > 0, "Risk score should be > 0");
  assert.ok(riskLevel === "critical" || riskLevel === "high", "Risk level should be high or critical");

  // 4. Verify API response shapes match expected contract
  const mappedNodes = nodes.map((node) => ({
    id: node.id,
    caseId: node.caseId,
    address: node.address,
    type: node.type,
    labels: node.labels,
    riskLevel: node.riskLevel,
    totalInUsd: node.totalInUsd,
    totalOutUsd: node.totalOutUsd,
    isTraceableDeadEnd: node.isTraceableDeadEnd,
    outDegree: node.outDegree,
    createdAt: node.createdAt,
  }));

  assert.equal(mappedNodes[0].isTraceableDeadEnd !== undefined, true);
  assert.equal(typeof mappedNodes[0].outDegree, "number");
});
