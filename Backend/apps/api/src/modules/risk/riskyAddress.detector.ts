import type { RiskFinding, FindingSeverity } from "@sih/shared-types";
import type { DetectorInput } from "./fanOut.detector.js";

/**
 * Risky Address Detector:
 * Flags any addresses classified as "ofac", "mixer", or "risky"
 * from the threat intelligence dataset (OFAC SDN, Tornado Cash, flagged money launderers).
 */
export function detectRiskyAddresses(input: DetectorInput): RiskFinding[] {
  const { caseId, rootAddress, nodes, edges, addressLabels = [] } = input;
  const findings: RiskFinding[] = [];
  const normalizedRoot = rootAddress.toLowerCase();

  const riskyLabelsMap = new Map<string, { type: string; label: string }>();
  for (const labelItem of addressLabels) {
    const t = labelItem.type.toLowerCase();
    if (t === "ofac" || t === "mixer" || t === "risky") {
      riskyLabelsMap.set(labelItem.address.toLowerCase(), {
        type: t,
        label: labelItem.label,
      });
    }
  }

  let findingCounter = 1;

  for (const node of nodes) {
    const addr = node.address.toLowerCase();
    const riskyInfo = riskyLabelsMap.get(addr);
    if (!riskyInfo) continue;

    const isOfac = riskyInfo.type === "ofac";
    const isMixer = riskyInfo.type === "mixer";

    const severity: FindingSeverity = isOfac ? "critical" : isMixer ? "high" : "high";
    const confidence = isOfac ? 0.99 : 0.95;

    const relatedEdges = edges.filter(
      (e) => e.fromNodeId === node.id || e.toNodeId === node.id
    );

    const relatedNodeIds = [node.id];
    if (addr !== normalizedRoot) {
      const rootNode = nodes.find((n) => n.address.toLowerCase() === normalizedRoot);
      if (rootNode) relatedNodeIds.push(rootNode.id);
    }

    const signals: string[] = [
      riskyInfo.type === "ofac"
        ? "sanctioned_entity"
        : riskyInfo.type === "mixer"
        ? "mixer_protocol"
        : "flagged_illicit_address",
    ];

    findings.push({
      id: `finding_risky_${caseId}_${findingCounter++}`,
      caseId,
      source: "basic-risk",
      type: "known_risky_address",
      severity,
      confidence,
      title: `${isOfac ? "Sanctioned Entity (OFAC)" : isMixer ? "Mixer Interaction" : "Flagged Risky Address"} Detected`,
      description: `Case involves address ${addr.slice(0, 10)}... matching watchlist: "${riskyInfo.label}".`,
      relatedNodeIds,
      relatedEdgeIds: relatedEdges.map((e) => e.id),
      signals,
      createdAt: new Date().toISOString(),
    });
  }

  return findings;
}
