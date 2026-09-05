import type { RiskFinding, RiskLevel } from "@sih/shared-types";

const SEVERITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const BASE_SCORE_BY_SEVERITY: Record<string, number> = {
  critical: 90,
  high: 70,
  medium: 40,
  low: 10,
};

/**
 * Computes deterministic preliminary risk score and level from basic risk findings.
 * - riskLevel: Highest severity among findings ("critical" > "high" > "medium" > "low"), default "low".
 * - riskScore: baseScore + (findings.length - 1) * 5, capped at 100 (0 if no findings).
 */
export function calculateRiskScore(findings: RiskFinding[]): {
  riskScore: number;
  riskLevel: RiskLevel;
} {
  if (findings.length === 0) {
    return {
      riskScore: 0,
      riskLevel: "low",
    };
  }

  let highestSeverity: RiskLevel = "low";
  let maxRank = 0;

  for (const f of findings) {
    const rank = SEVERITY_RANK[f.severity] ?? 1;
    if (rank > maxRank) {
      maxRank = rank;
      highestSeverity = f.severity as RiskLevel;
    }
  }

  const baseScore = BASE_SCORE_BY_SEVERITY[highestSeverity] ?? 10;
  const multiFindingBonus = (findings.length - 1) * 5;
  const riskScore = Math.min(100, baseScore + multiFindingBonus);

  return {
    riskScore,
    riskLevel: highestSeverity,
  };
}
