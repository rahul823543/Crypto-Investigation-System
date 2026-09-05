import type { RiskFinding } from "@sih/shared-types";
import type { DetectorInput } from "./fanOut.detector.js";

/**
 * DEX Interaction Detector:
 * Flags interactions where transactions route through known decentralized exchange routers
 * or call DEX-like swap functions (e.g. swapExactTokensForTokens, QuickSwap, Uniswap).
 */
export function detectDexInteractions(input: DetectorInput): RiskFinding[] {
  const { caseId, rootAddress, nodes, edges, transactions } = input;
  const findings: RiskFinding[] = [];
  const normalizedRoot = rootAddress.toLowerCase();

  const dexNodes = nodes.filter((n) => n.type === "dex");
  const dexAddressSet = new Set(dexNodes.map((n) => n.address.toLowerCase()));

  const swapMethods = [
    "swapExactTokensForTokens",
    "swapExactETHForTokens",
    "swapTokensForExactTokens",
    "swapExactTokensForETH",
    "swap",
    "exactInputSingle",
    "exactInput",
  ];

  const dexTxs = transactions.filter(
    (tx) =>
      dexAddressSet.has(tx.to.toLowerCase()) ||
      dexAddressSet.has(tx.from.toLowerCase()) ||
      (tx.method && swapMethods.some((m) => tx.method?.toLowerCase().includes(m.toLowerCase())))
  );

  if (dexTxs.length === 0) return [];

  const touchedDexAddresses = new Set<string>();
  for (const tx of dexTxs) {
    if (dexAddressSet.has(tx.to.toLowerCase())) touchedDexAddresses.add(tx.to.toLowerCase());
    if (dexAddressSet.has(tx.from.toLowerCase())) touchedDexAddresses.add(tx.from.toLowerCase());
  }

  let findingCounter = 1;

  for (const dexAddr of touchedDexAddresses) {
    const dexNode = nodes.find((n) => n.address.toLowerCase() === dexAddr);
    const relatedTxs = dexTxs.filter(
      (tx) => tx.to.toLowerCase() === dexAddr || tx.from.toLowerCase() === dexAddr
    );

    const totalUsd = relatedTxs.reduce((sum, t) => sum + (t.amountUsd ?? 0), 0);
    const dexLabel = dexNode?.labels?.[1] || dexNode?.labels?.[0] || "DEX Router";
    const asset = relatedTxs[0]?.asset ?? "USD";

    const relatedNodeSet = new Set<string>();
    if (dexNode) relatedNodeSet.add(dexNode.id);

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

    const signals = ["dex_router", "swap_method"];
    if (totalUsd > 1000) signals.push("value_above_threshold");

    findings.push({
      id: `finding_dex_${caseId}_${findingCounter++}`,
      caseId,
      source: "basic-risk",
      type: "dex_interaction",
      severity: "medium",
      confidence: 0.85,
      title: "DEX interaction detected",
      description: `${touchesRoot ? "Root wallet" : "Case address"} routed ${totalUsd > 0 ? `$${totalUsd.toLocaleString()} ${asset}` : "funds"} through ${dexLabel}, potentially converting to another token to obscure the trail.`,
      relatedNodeIds: Array.from(relatedNodeSet),
      relatedEdgeIds,
      signals,
      createdAt: new Date().toISOString(),
    });
  }

  return findings;
}
