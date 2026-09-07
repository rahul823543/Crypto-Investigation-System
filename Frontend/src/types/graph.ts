// ─── Graph Types ────────────────────────────────────────────────────────────
// Aligned with Backend/packages/shared-types/src/graph.ts

import type { RiskLevel } from './case';

export type NodeType = 'wallet' | 'contract' | 'dex' | 'bridge' | 'exchange' | 'risky_address' | 'mixer' | 'unknown';

export interface GraphNode {
  /** Stable ID: "wallet:0x..." | "dex:0x..." | "bridge:0x..." */
  id: string;
  address: string;
  type: NodeType;
  /** Classification labels e.g. ["root", "dex"] */
  labels: string[];
  riskLevel: RiskLevel;
  totalInUsd: number;
  totalOutUsd: number;
  hopDepth?: number;
  /** True when the node is a mixer or labeled VASP — traversal stops here */
  isTraceableDeadEnd?: boolean;
  /** Count of outgoing edges from this node */
  outDegree?: number;
}

export type TransferType = 'native' | 'erc20' | 'contract_call';

export interface GraphEdge {
  /** Stable ID: "edge:0x{txHash}:{index}" */
  id: string;
  from: string;
  to: string;
  transactionHash: string;
  asset: string;
  amount: string;
  amountUsd: number;
  timestamp: string;
  transferType: TransferType;
  hopDepth: number;
  riskLevel: RiskLevel;
}

export interface GraphMetadata {
  nodeCount: number;
  edgeCount: number;
  maxHopDepth: number;
}

export interface CaseGraph {
  caseId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: GraphMetadata;
}
