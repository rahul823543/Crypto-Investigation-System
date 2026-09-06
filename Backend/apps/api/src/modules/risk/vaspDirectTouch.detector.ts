import type { RiskFinding } from "@sih/shared-types";
import type { DetectorInput } from "./fanOut.detector.js";

/**
 * Direct VASP Touch Detector:
 * Flags situations where suspect funds move directly or within 1-2 hops into a known
 * Virtual Asset Service Provider (e.g. Binance, Coinbase, Kraken deposit address).
 * These represent primary legal subpoena and identification off-ramp targets.
 */
export function detectVaspDirectTouch(input: DetectorInput): RiskFinding[] {
  const { caseId, rootAddress, nodes, edges, transactions, addressLabels = [] } = input;
  const findings: RiskFinding[] = [];
  const normalizedRoot = rootAddress.toLowerCase();

  const vaspLabels = new Set(
    addressLabels
      .filter((l: import("@sih/shared-types").AddressLabel) => l.type === "vasp" || l.label.toLowerCase().includes("binance") || l.label.toLowerCase().includes("coinbase") || l.label.toLowerCase().includes("exchange") || l.label.toLowerCase().includes("vasp"))
      .map((l: import("@sih/shared-types").AddressLabel) => l.address.toLowerCase())
  );

  const vaspNodes = nodes.filter(
    (n) =>
      n.type === "vasp" ||
      vaspLabels.has(n.address.toLowerCase()) ||
      n.labels.some((l) => l.toLowerCase().includes("vasp") || l.toLowerCase().includes("exchange"))
  );
  const vaspAddressSet = new Set(vaspNodes.map((n) => n.address.toLowerCase()));

  for (const addr of vaspLabels) {
    vaspAddressSet.add(addr);
  }

  const vaspTxs = transactions.filter(
    (tx) =>
      vaspAddressSet.has(tx.to.toLowerCase()) ||
      vaspAddressSet.has(tx.from.toLowerCase())
  );

  if (vaspTxs.length === 0 && vaspNodes.length === 0) return [];

  const touchedVaspAddresses = new Set<string>();
  for (const tx of vaspTxs) {
    if (vaspAddressSet.has(tx.to.toLowerCase())) touchedVaspAddresses.add(tx.to.toLowerCase());
    if (vaspAddressSet.has(tx.from.toLowerCase())) touchedVaspAddresses.add(tx.from.toLowerCase());
  }

  let findingCounter = 1;

  for (const vaspAddr of touchedVaspAddresses) {
    const vaspNode = nodes.find((n) => n.address.toLowerCase() === vaspAddr);
    const relatedTxs = vaspTxs.filter(
      (tx) => tx.to.toLowerCase() === vaspAddr || tx.from.toLowerCase() === vaspAddr
    );

    const labelMatch = addressLabels.find((l) => l.address.toLowerCase() === vaspAddr);
    const vaspLabel = labelMatch?.label || vaspNode?.labels?.[0] || "VASP Entity";

    const isDirectHop = relatedTxs.some((tx) => tx.from.toLowerCase() === normalizedRoot || tx.to.toLowerCase() === normalizedRoot);
    const hopDistance = isDirectHop ? 1 : 2;

    const relatedNodeSet = new Set<string>();
    if (vaspNode) relatedNodeSet.add(vaspNode.id);

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

    findings.push({
      id: `finding-vasp-${findingCounter++}`,
      caseId,
      source: "basic-risk",
      type: "vasp_direct_touch",
      severity: "medium",
      confidence: hopDistance === 1 ? 0.95 : 0.85,
      title: `Direct VASP Touch: ${vaspLabel}`,
      description: `Wallet transacted with labeled VASP deposit address ${vaspLabel} (${vaspAddr}) at hop distance ${hopDistance}. Serves as a primary target for subpoena and KYC attribution.`,
      relatedNodeIds: Array.from(relatedNodeSet),
      relatedEdgeIds: Array.from(new Set(relatedEdgeIds)),
      signals: ["labeled_vasp_address", `hop_distance_${hopDistance}`],
      createdAt: new Date().toISOString(),
    });
  }

  return findings;
}
