import type { GraphNode, AddressLabel, NodeType } from "@sih/shared-types";

export const HUB_THRESHOLD = 500;

export interface NodeClassificationResult {
  isTraceableDeadEnd: boolean;
  outDegree: number;
  type: NodeType;
  labels: string[];
}

/**
 * Classifies a node and assigns `isTraceableDeadEnd` and `outDegree` per BACKEND_PLAN_v3 §6.
 *
 * Rules:
 *  - Ordinary wallet: isTraceableDeadEnd = false (follow every outgoing edge)
 *  - Labeled exchange / VASP deposit: isTraceableDeadEnd = true (legal off-ramp, stop traversal)
 *  - Labeled mixer/tumbler: isTraceableDeadEnd = true (obfuscation point, do not trace through)
 *  - Labeled DEX router / bridge: isTraceableDeadEnd = false (asset changes, on-chain trail continues)
 *  - Unlabeled high-degree wallet (outDegree > HUB_THRESHOLD): isTraceableDeadEnd = true
 */
export function classifyNode(
  node: GraphNode,
  outgoingEdgeCount: number,
  addressLabels: AddressLabel[] = [],
  hubThreshold: number = HUB_THRESHOLD
): NodeClassificationResult {
  const addrLower = node.address.toLowerCase();
  const matchedLabel = addressLabels.find(
    (l) => l.address.toLowerCase() === addrLower
  );

  const labels = [...(node.labels || [])];
  let nodeType: NodeType = node.type;

  if (matchedLabel) {
    if (!labels.includes(matchedLabel.label)) {
      labels.push(matchedLabel.label);
    }
    if (
      matchedLabel.type === "mixer" ||
      matchedLabel.type === "vasp" ||
      matchedLabel.type === "dex" ||
      matchedLabel.type === "bridge" ||
      matchedLabel.type === "contract" ||
      matchedLabel.type === "exchange"
    ) {
      nodeType = matchedLabel.type as NodeType;
    }
  }

  const isMixer =
    nodeType === "mixer" ||
    labels.some(
      (l) =>
        l.toLowerCase().includes("mixer") ||
        l.toLowerCase().includes("tornado")
    );

  const isVasp =
    nodeType === "vasp" ||
    labels.some(
      (l) =>
        l.toLowerCase().includes("vasp") ||
        l.toLowerCase().includes("exchange") ||
        l.toLowerCase().includes("binance") ||
        l.toLowerCase().includes("coinbase") ||
        l.toLowerCase().includes("kraken")
    );

  const isHub = outgoingEdgeCount > hubThreshold;

  const isTraceableDeadEnd = isMixer || isVasp || isHub;

  return {
    isTraceableDeadEnd,
    outDegree: outgoingEdgeCount,
    type: nodeType,
    labels,
  };
}
