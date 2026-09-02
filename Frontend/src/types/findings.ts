// ─── Finding Types ──────────────────────────────────────────────────────────
// Aligned with Backend/packages/shared-types/src/graph.ts (RiskFinding)

import type { RiskLevel } from './case';

export type FindingSource = 'basic-risk' | 'python-intelligence';

export type FindingType =
  | 'fan_out'
  | 'dex_interaction'
  | 'bridge_interaction'
  | 'risky_address'
  | 'known_risky_address'
  | 'circular_flow'
  | 'rapid_movement'
  | 'suspicious_path'
  | 'multi_hop_laundering';

export interface GraphFinding {
  id: string;
  source: FindingSource;
  type: FindingType;
  severity: RiskLevel;
  confidence: number;
  title: string;
  description: string;
  relatedNodeIds: string[];
  relatedEdgeIds: string[];
  signals: string[];
}
