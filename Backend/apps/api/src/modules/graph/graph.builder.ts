import type {
  GraphBuildInput,
  GraphBuildOutput,
  GraphNode,
  GraphEdge,
  AddressLabel,
  NodeType,
  RiskLevel,
} from "@sih/shared-types";

import defaultAddressLabels from "../../datasets/address-labels.json" with {
  type: "json",
};

/**
 * Builds deterministic graph nodes and edges from a set of normalized transactions.
 * Classifies node types using address labels, aggregates totalInUsd/totalOutUsd,
 * and calculates hop depths via BFS traversal from the root address.
 */
export async function buildGraph(
  input: GraphBuildInput
): Promise<GraphBuildOutput> {
  const { caseId, rootAddress, transactions } = input;
  const addressLabels: AddressLabel[] =
    input.addressLabels && input.addressLabels.length > 0
      ? input.addressLabels
      : (defaultAddressLabels as AddressLabel[]);

  const normalizedRoot = rootAddress.toLowerCase();

  const labelMap = new Map<string, AddressLabel>();
  for (const item of addressLabels) {
    labelMap.set(item.address.toLowerCase(), item);
  }

  // 1. Identify all unique addresses involved
  const addressSet = new Set<string>();
  addressSet.add(normalizedRoot);

  for (const tx of transactions) {
    if (tx.from) addressSet.add(tx.from.toLowerCase());
    if (tx.to) addressSet.add(tx.to.toLowerCase());
  }

  // 2. Classify each address and generate node IDs
  const nodeMap = new Map<string, GraphNode>();
  const createdAtIso = new Date().toISOString();

  for (const addr of addressSet) {
    const isRoot = addr === normalizedRoot;
    const labelEntry = labelMap.get(addr);

    let type: NodeType = "wallet";
    const labels: string[] = [];

    if (isRoot) {
      labels.push("root");
    }

    if (labelEntry) {
      const rawType = labelEntry.type.toLowerCase();
      if (
        rawType === "dex" ||
        rawType === "bridge" ||
        rawType === "mixer" ||
        rawType === "contract" ||
        rawType === "exchange" ||
        rawType === "wallet"
      ) {
        type = rawType as NodeType;
      } else if (rawType === "ofac" || rawType === "risky") {
        type = "wallet";
      }

      const cleanLabel = labelEntry.label.toLowerCase();
      if (!labels.includes(type)) labels.push(type);
      if (!labels.includes(cleanLabel)) labels.push(cleanLabel);
    }

    const nodeId = `${type}:${addr}`;

    nodeMap.set(addr, {
      id: nodeId,
      caseId,
      address: addr,
      type,
      labels,
      riskLevel: isRoot ? "high" : null,
      totalInUsd: 0,
      totalOutUsd: 0,
      createdAt: createdAtIso,
    });
  }

  // 3. Compute incoming and outgoing volumes
  for (const tx of transactions) {
    const fromAddr = tx.from?.toLowerCase();
    const toAddr = tx.to?.toLowerCase();
    const usd = tx.amountUsd ?? (parseFloat(tx.amount) || 0);

    if (fromAddr && nodeMap.has(fromAddr)) {
      const fromNode = nodeMap.get(fromAddr)!;
      fromNode.totalOutUsd = (fromNode.totalOutUsd ?? 0) + usd;
    }

    if (toAddr && nodeMap.has(toAddr)) {
      const toNode = nodeMap.get(toAddr)!;
      toNode.totalInUsd = (toNode.totalInUsd ?? 0) + usd;
    }
  }

  // 4. Calculate BFS Hop Depths from root node
  const adjacencyList = new Map<string, Set<string>>();
  for (const addr of addressSet) {
    adjacencyList.set(addr, new Set());
  }

  for (const tx of transactions) {
    const fromAddr = tx.from?.toLowerCase();
    const toAddr = tx.to?.toLowerCase();
    if (fromAddr && toAddr && adjacencyList.has(fromAddr)) {
      adjacencyList.get(fromAddr)!.add(toAddr);
    }
  }

  const hopDepthMap = new Map<string, number>();
  hopDepthMap.set(normalizedRoot, 0);

  const queue: string[] = [normalizedRoot];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = hopDepthMap.get(current)!;

    const neighbors = adjacencyList.get(current) || new Set();
    for (const neighbor of neighbors) {
      if (!hopDepthMap.has(neighbor)) {
        hopDepthMap.set(neighbor, currentDepth + 1);
        queue.push(neighbor);
      }
    }
  }

  // 5. Construct Graph Edges
  const sortedTransactions = [...transactions].sort((a, b) => {
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  const txCountMap = new Map<string, number>();
  const edges: GraphEdge[] = [];

  for (const tx of sortedTransactions) {
    const fromAddr = tx.from?.toLowerCase();
    const toAddr = tx.to?.toLowerCase();
    if (!fromAddr || !toAddr) continue;

    const fromNode = nodeMap.get(fromAddr);
    const toNode = nodeMap.get(toAddr);
    if (!fromNode || !toNode) continue;

    const txHash = tx.hash.toLowerCase();
    const index = txCountMap.get(txHash) ?? 0;
    txCountMap.set(txHash, index + 1);

    const edgeId = `edge:${txHash}:${index}`;

    const fromDepth = hopDepthMap.get(fromAddr) ?? 0;
    const hopDepth = fromDepth + 1;

    let edgeRiskLevel: RiskLevel | null = null;
    if (toNode.type === "dex" || toNode.type === "bridge" || toNode.type === "mixer") {
      edgeRiskLevel = "high";
    } else if (fromDepth === 0) {
      edgeRiskLevel = "medium";
    } else {
      edgeRiskLevel = "low";
    }

    const amountUsd =
      tx.amountUsd !== null && tx.amountUsd !== undefined
        ? Number(tx.amountUsd)
        : parseFloat(tx.amount) || null;

    edges.push({
      id: edgeId,
      caseId,
      fromNodeId: fromNode.id,
      toNodeId: toNode.id,
      from: fromNode.id,
      to: toNode.id,
      transactionHash: tx.hash,
      asset: tx.asset,
      amount: tx.amount,
      amountUsd,
      timestamp:
        typeof tx.timestamp === "string"
          ? tx.timestamp
          : new Date(tx.timestamp).toISOString(),
      hopDepth,
      riskLevel: edgeRiskLevel,
      createdAt: createdAtIso,
    });
  }

  const nodes = Array.from(nodeMap.values());

  return {
    nodes,
    edges,
  };
}
