import type { RiskFinding } from "@sih/shared-types";
import type { DetectorInput } from "./fanOut.detector.js";

/**
 * Bridge Interaction Detector:
 * Flags cross-chain bridge interactions (Hop, Polygon PoS, xDai, etc.)
 * which are commonly used in laundering chains to hop assets between blockchains.
 */
export function detectBridgeInteractions(input: DetectorInput): RiskFinding[] {
  const { caseId, rootAddress, nodes, edges, transactions } = input;
  const findings: RiskFinding[] = [];
  const normalizedRoot = rootAddress.toLowerCase();

  const bridgeNodes = nodes.filter((n) => n.type === "bridge");
  const bridgeAddressSet = new Set(bridgeNodes.map((n) => n.address.toLowerCase()));

  const bridgeTxs = transactions.filter(
    (tx) =>
      bridgeAddressSet.has(tx.to.toLowerCase()) ||
      bridgeAddressSet.has(tx.from.toLowerCase())
  );

  if (bridgeTxs.length === 0) return [];

  const touchedBridgeAddresses = new Set<string>();
  for (const tx of bridgeTxs) {
    if (bridgeAddressSet.has(tx.to.toLowerCase())) touchedBridgeAddresses.add(tx.to.toLowerCase());
    if (bridgeAddressSet.has(tx.from.toLowerCase())) touchedBridgeAddresses.add(tx.from.toLowerCase());
  }

  let findingCounter = 1;

  for (const bridgeAddr of touchedBridgeAddresses) {
    const bridgeNode = nodes.find((n) => n.address.toLowerCase() === bridgeAddr);
    const relatedTxs = bridgeTxs.filter(
      (tx) => tx.to.toLowerCase() === bridgeAddr || tx.from.toLowerCase() === bridgeAddr
    );

    const totalUsd = relatedTxs.reduce((sum, t) => sum + (t.amountUsd ?? 0), 0);
    const bridgeLabel = bridgeNode?.labels?.[1] || bridgeNode?.labels?.[0] || "Bridge Contract";
    const asset = relatedTxs[0]?.asset ?? "USD";

    const relatedNodeSet = new Set<string>();
    if (bridgeNode) relatedNodeSet.add(bridgeNode.id);

    const relatedEdgeIds: string[] = [];
    for (const tx of relatedTxs) {
      const fromNode = nodes.find((n) => n.address.toLowerCase() === tx.from.toLowerCase());
      if (fromNode) relatedNodeSet.add(fromNode.id);
      const toNode = nodes.find((n) => n.address.toLowerCase() === tx.to.toLowerCase());
      if (toNode) relatedNodeSet.add(toNode.id);

      const edge = edges.find((e) => e.transactionHash.toLowerCase() === tx.hash.toLowerCase());
      if (edge) relatedEdgeIds.push(edge.id);
    }

    const touchesRoot = relatedTxs.some(
      (tx) => tx.from.toLowerCase() === normalizedRoot || tx.to.toLowerCase() === normalizedRoot
    );

    const signals = ["cross_chain_bridge", "bridge_predicate"];
    if (totalUsd > 1000) signals.push("value_above_threshold");

    findings.push({
      id: `finding_bridge_${caseId}_${findingCounter++}`,
      caseId,
      source: "basic-risk",
      type: "bridge_interaction",
      severity: "medium",
      confidence: 0.85,
      title: "Bridge interaction detected",
      description: `${touchesRoot ? "Root wallet" : "Case address"} routed ${totalUsd > 0 ? `$${totalUsd.toLocaleString()} ${asset}` : "funds"} through ${bridgeLabel}, attempting cross-chain transfer.`,
      relatedNodeIds: Array.from(relatedNodeSet),
      relatedEdgeIds,
      signals,
      createdAt: new Date().toISOString(),
    });
  }

  return findings;
}
