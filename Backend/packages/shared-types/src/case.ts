export type CaseMode = "demo" | "live";

export type CaseStatus =
  | "created"
  | "ingesting"
  | "ingested"
  | "graph_building"
  | "graph_ready"
  | "analyzing"
  | "analyzed"
  | "report_generating"
  | "report_ready"
  | "evidence_storing"
  | "completed"
  | "failed"
  | "demo_fallback_used";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface Case {
  id: string;
  rootAddress: string;
  chainId: number;
  mode: CaseMode;
  status: CaseStatus;
  riskScore: number | null;
  riskLevel: RiskLevel | null;
  errorMessage: string | null;
  createdAt: string; // ISO date string
  updatedAt: string;
}

export interface CreateCaseRequest {
  rootAddress: string;
  chainId: number;
  mode: CaseMode;
}

export interface CreateCaseResponse {
  case: Case;
}