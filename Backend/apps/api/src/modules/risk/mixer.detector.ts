import type { RiskFinding } from "@sih/shared-types";
import type { DetectorInput } from "./fanOut.detector.js";

/**
 * Mixer Interaction Detector:
 * Flags any interactions where a node matches the "mixer" label category.
 * On-chain trail ends at mixers, requiring off-chain/legal process.
 */
export function detectMixerInteractions(input: DetectorInput): RiskFinding[] {
  const { caseId, nodes, edges, addressLabels = [] } = input;
  const findings: RiskFinding[] = [];

  const mixerAddressSet = new Set<string>();
  for (const label of addressLabels) {
    if (label.type.toLowerCase() === "mixer") {
      mixerAddressSet.add(label.address.toLowerCase());
    }
  }

  // Also include nodes typed as mixer
  for (const node of nodes) {
    if (
      node.type === "mixer" ||
      node.labels.map((l) => l.toLowerCase()).includes("mixer")
    ) {
      mixerAddressSet.add(node.address.toLowerCase());
    }
  }

  let findingCounter = 1;

  for (const mixerAddr of mixerAddressSet) {
    const mixerNode = nodes.find(
      (n) => n.address.toLowerCase() === mixerAddr
    );
    if (!mixerNode) continue;

    const relatedEdges = edges.filter(
      (e) =>
        e.fromNodeId === mixerNode.id ||
        e.toNodeId === mixerNode.id ||
        e.from === mixerNode.id ||
        e.to === mixerNode.id
    );

    const relatedNodeIds = [mixerNode.id];
    for (const edge of relatedEdges) {
      if (edge.fromNodeId && !relatedNodeIds.includes(edge.fromNodeId)) {
        relatedNodeIds.push(edge.fromNodeId);
      }
      if (edge.toNodeId && !relatedNodeIds.includes(edge.toNodeId)) {
        relatedNodeIds.push(edge.toNodeId);
      }
    }

    findings.push({
      id: `finding_mixer_${caseId}_${findingCounter++}`,
      caseId,
      source: "basic-risk",
      type: "mixer_interaction",
      severity: "critical",
      confidence: 0.95,
      title: "Funds routed through known mixer",
      description:
        "Wallet deposited into a labeled mixing service. On-chain trail ends here; further tracing requires off-chain/legal process.",
      relatedNodeIds,
      relatedEdgeIds: relatedEdges.map((e) => e.id),
      signals: ["known_mixer_address"],
      createdAt: new Date().toISOString(),
    });
  }

  return findings;
}
