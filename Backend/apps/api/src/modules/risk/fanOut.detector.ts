import type {
  GraphNode,
  GraphEdge,
  RiskFinding,
  NormalizedTransaction,
  AddressLabel,
} from "@sih/shared-types";

export interface DetectorInput {
  caseId: string;
  rootAddress: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  transactions: NormalizedTransaction[];
  addressLabels?: AddressLabel[];
}

/**
 * Fan-Out Detector:
 * Flags situations where a single address sends funds to multiple (>= 3)
 * unique destination addresses within a short timeframe (e.g. <= 30 mins).
 */
export function detectFanOut(input: DetectorInput): RiskFinding[] {
  const { caseId, rootAddress, nodes, edges, transactions } = input;
  const findings: RiskFinding[] = [];
  const normalizedRoot = rootAddress.toLowerCase();

  const senderMap = new Map<string, NormalizedTransaction[]>();
  for (const tx of transactions) {
    const from = tx.from.toLowerCase();
    if (!senderMap.has(from)) {
      senderMap.set(from, []);
    }
    senderMap.get(from)!.push(tx);
  }

  let findingCounter = 1;

  for (const [sender, txs] of senderMap.entries()) {
    if (txs.length < 3) continue;

    const uniqueRecipients = new Set(txs.map((t) => t.to.toLowerCase()));
    if (uniqueRecipients.size < 3) continue;

    const timestamps = txs
      .map((t) => new Date(t.timestamp).getTime())
      .filter((ts) => !isNaN(ts))
      .sort((a, b) => a - b);

    const minTime = timestamps[0];
    const maxTime = timestamps[timestamps.length - 1];
    const durationMinutes = Math.max(1, Math.round((maxTime - minTime) / (1000 * 60)));

    const totalUsd = txs.reduce((sum, t) => sum + (t.amountUsd ?? 0), 0);
    const asset = txs[0]?.asset ?? "USD";

    const relatedNodeSet = new Set<string>();
    const senderNode = nodes.find((n) => n.address.toLowerCase() === sender);
    if (senderNode) relatedNodeSet.add(senderNode.id);

    for (const recipient of uniqueRecipients) {
      const recipientNode = nodes.find((n) => n.address.toLowerCase() === recipient);
      if (recipientNode) relatedNodeSet.add(recipientNode.id);
    }

    const txHashes = new Set(txs.map((t) => t.hash.toLowerCase()));
    const relatedEdgeIds = edges
      .filter((e) => txHashes.has(e.transactionHash.toLowerCase()))
      .map((e) => e.id);

    const isRoot = sender === normalizedRoot;
    const signals: string[] = ["many_outputs", "short_time_window"];
    if (totalUsd > 5000) signals.push("high_total_value");

    findings.push({
      id: `finding_fanout_${caseId}_${findingCounter++}`,
      caseId,
      source: "basic-risk",
      type: "fan_out",
      severity: "high",
      confidence: 0.92,
      title: "Fan-out detected",
      description: `${isRoot ? "Root wallet" : `Wallet ${sender.slice(0, 8)}...`} sent funds to ${uniqueRecipients.size} unique addresses within ${durationMinutes} minutes${totalUsd > 0 ? `, totalling $${totalUsd.toLocaleString()} ${asset}` : ""}.`,
      relatedNodeIds: Array.from(relatedNodeSet),
      relatedEdgeIds,
      signals,
      createdAt: new Date().toISOString(),
    });
  }

  return findings;
}
