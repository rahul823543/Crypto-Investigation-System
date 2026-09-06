import type { RiskFinding } from "@sih/shared-types";
import type { DetectorInput } from "./fanOut.detector.js";

/**
 * Direct VASP-Touch Detector:
 * Flags situations where a node within 1-2 hops of the root
 * matches the "vasp" label category.
 */
export function detectVaspDirectTouch(input: DetectorInput): RiskFinding[] {
  const { caseId, rootAddress, nodes, edges, addressLabels = [] } = input;
  const findings: RiskFinding[] = [];
  const normalizedRoot = rootAddress.toLowerCase();

  const vaspAddressSet = new Set<string>();
  for (const label of addressLabels) {
    const t = label.type.toLowerCase();
    if (t === "vasp" || t === "exchange") {
      vaspAddressSet.add(label.address.toLowerCase());
    }
  }

  for (const node of nodes) {
    if (
      node.type === "vasp" ||
      node.type === "exchange" ||
      node.labels.map((l) => l.toLowerCase()).includes("vasp") ||
      node.labels.map((l) => l.toLowerCase()).includes("exchange")
    ) {
      vaspAddressSet.add(node.address.toLowerCase());
    }
  }

  // BFS hop distance from root if not already annotated
  const hopDepthMap = new Map<string, number>();
  hopDepthMap.set(normalizedRoot, 0);

  const adjacencyList = new Map<string, Set<string>>();
  for (const node of nodes) {
    adjacencyList.set(node.address.toLowerCase(), new Set());
  }

  for (const edge of edges) {
    const fromNode = nodes.find((n) => n.id === edge.fromNodeId || n.id === edge.from);
    const toNode = nodes.find((n) => n.id === edge.toNodeId || n.id === edge.to);
    if (fromNode && toNode) {
      const fromAddr = fromNode.address.toLowerCase();
      const toAddr = toNode.address.toLowerCase();
      if (adjacencyList.has(fromAddr)) {
        adjacencyList.get(fromAddr)!.add(toAddr);
      }
    }
  }

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

  let findingCounter = 1;

  for (const vaspAddr of vaspAddressSet) {
    const vaspNode = nodes.find(
      (n) => n.address.toLowerCase() === vaspAddr
    );
    if (!vaspNode) continue;

    const hopDistance = hopDepthMap.get(vaspAddr);
    // Only flag if within 1-2 hops of the root
    if (hopDistance === undefined || hopDistance < 1 || hopDistance > 2) {
      continue;
    }

    const relatedEdges = edges.filter(
      (e) =>
        e.toNodeId === vaspNode.id ||
        e.fromNodeId === vaspNode.id ||
        e.to === vaspNode.id ||
        e.from === vaspNode.id
    );

    const relatedNodeIds = [vaspNode.id];
    for (const edge of relatedEdges) {
      if (edge.fromNodeId && !relatedNodeIds.includes(edge.fromNodeId)) {
        relatedNodeIds.push(edge.fromNodeId);
      }
      if (edge.toNodeId && !relatedNodeIds.includes(edge.toNodeId)) {
        relatedNodeIds.push(edge.toNodeId);
      }
    }

    findings.push({
      id: `finding_vasp_${caseId}_${findingCounter++}`,
      caseId,
      source: "basic-risk",
      type: "vasp_direct_touch",
      severity: "info",
      confidence: 0.85,
      title: "Direct VASP contact detected",
      description:
        "Wallet transacted directly with a labeled VASP deposit address.",
      relatedNodeIds,
      relatedEdgeIds: relatedEdges.map((e) => e.id),
      signals: ["labeled_vasp_address", `hop_distance_${hopDistance}`],
      createdAt: new Date().toISOString(),
    });
  }

  return findings;
}
