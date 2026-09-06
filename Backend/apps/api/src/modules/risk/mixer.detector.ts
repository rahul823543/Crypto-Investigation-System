import type { RiskFinding } from "@sih/shared-types";
import type { DetectorInput } from "./fanOut.detector.js";

/**
 * Mixer Interaction Detector:
 * Flags interactions where transactions touch known mixer smart contracts or tumblers
 * (e.g. Tornado Cash pools). These represent severe obfuscation points.
 */
export function detectMixerInteractions(input: DetectorInput): RiskFinding[] {
  const { caseId, nodes, edges, transactions, addressLabels = [] } = input;
  const findings: RiskFinding[] = [];

  const mixerLabels = new Set(
    addressLabels
      .filter((l: import("@sih/shared-types").AddressLabel) => l.type === "mixer" || l.label.toLowerCase().includes("tornado") || l.label.toLowerCase().includes("mixer"))
      .map((l: import("@sih/shared-types").AddressLabel) => l.address.toLowerCase())
  );

  const mixerNodes = nodes.filter(
    (n) =>
      n.type === "mixer" ||
      mixerLabels.has(n.address.toLowerCase()) ||
      n.labels.some((l) => l.toLowerCase().includes("mixer") || l.toLowerCase().includes("tornado"))
  );
  const mixerAddressSet = new Set(mixerNodes.map((n) => n.address.toLowerCase()));

  for (const addr of mixerLabels) {
    mixerAddressSet.add(addr);
  }

  const mixerTxs = transactions.filter(
    (tx) =>
      mixerAddressSet.has(tx.to.toLowerCase()) ||
      mixerAddressSet.has(tx.from.toLowerCase())
  );

  if (mixerTxs.length === 0 && mixerNodes.length === 0) return [];

  const touchedMixerAddresses = new Set<string>();
  for (const tx of mixerTxs) {
    if (mixerAddressSet.has(tx.to.toLowerCase())) touchedMixerAddresses.add(tx.to.toLowerCase());
    if (mixerAddressSet.has(tx.from.toLowerCase())) touchedMixerAddresses.add(tx.from.toLowerCase());
  }

  let findingCounter = 1;

  for (const mixerAddr of touchedMixerAddresses) {
    const mixerNode = nodes.find((n) => n.address.toLowerCase() === mixerAddr);
    const relatedTxs = mixerTxs.filter(
      (tx) => tx.to.toLowerCase() === mixerAddr || tx.from.toLowerCase() === mixerAddr
    );

    const totalUsd = relatedTxs.reduce((sum, t) => sum + (t.amountUsd ?? 0), 0);
    const labelMatch = addressLabels.find((l) => l.address.toLowerCase() === mixerAddr);
    const mixerLabel = labelMatch?.label || mixerNode?.labels?.[0] || "Mixer Contract";

    const relatedNodeSet = new Set<string>();
    if (mixerNode) relatedNodeSet.add(mixerNode.id);

    const relatedEdgeIds: string[] = [];
    for (const tx of relatedTxs) {
      const fromNode = nodes.find((n) => n.address.toLowerCase() === tx.from.toLowerCase());
      if (fromNode) relatedNodeSet.add(fromNode.id);
      const toNode = nodes.find((n) => n.address.toLowerCase() === tx.to.toLowerCase());
      if (toNode) relatedNodeSet.add(toNode.id);

      const matchingEdges = edges.filter((e) => e.transactionHash.toLowerCase() === tx.hash.toLowerCase());
      for (const edge of matchingEdges) {
        relatedEdgeIds.push(edge.id);
      }
    }

    const txCount = relatedTxs.length;

    findings.push({
      id: `finding-mixer-${findingCounter++}`,
      caseId,
      source: "basic-risk",
      type: "mixer_interaction",
      severity: "critical",
      confidence: 0.95,
      title: `Mixer Interaction: ${mixerLabel}`,
      description: `Detected ${txCount} transaction(s) involving mixer pool ${mixerLabel} (${mixerAddr}). Fund flow is deliberately obscured here; this node serves as a forensic dead end.`,
      relatedNodeIds: Array.from(relatedNodeSet),
      relatedEdgeIds: Array.from(new Set(relatedEdgeIds)),
      signals: ["mixer_interaction", "tornado_cash", "anonymity_pool"],
      createdAt: new Date().toISOString(),
    });
  }

  return findings;
}
