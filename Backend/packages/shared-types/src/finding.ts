export type FindingSeverity = "low" | "medium" | "high" | "critical";

export type FindingSource = "basic-risk" | "python-intelligence";

export interface RiskFinding {
  id: string;
  caseId: string;
  source: FindingSource;
  type: string;
  severity: FindingSeverity;
  confidence: number;
  title: string;
  description: string;
  relatedNodeIds: string[];
  relatedEdgeIds: string[];
  signals: string[];
  createdAt: string; // ISO date string
}
