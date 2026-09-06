import { z } from "zod";
import type { AnalysisRequest, AnalysisResponse } from "@sih/shared-types";

const evmAddressRegex = /^0x[0-9a-fA-F]{40}$/;

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

const graphNodeSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  address: z.string().regex(evmAddressRegex, "Invalid EVM address"),
  type: z.enum([
    "wallet",
    "contract",
    "exchange",
    "vasp",
    "dex",
    "bridge",
    "mixer",
    "unknown",
  ]),
  labels: z.array(z.string()),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).nullable(),
  totalInUsd: z.number().nullable(),
  totalOutUsd: z.number().nullable(),
  isTraceableDeadEnd: z.boolean(),
  outDegree: z.number().int().nonnegative(),
  createdAt: z.string(),
});

const graphEdgeSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  fromNodeId: z.string().min(1),
  toNodeId: z.string().min(1),
  from: z.string().optional(),
  to: z.string().optional(),
  transactionHash: z.string().min(1),
  asset: z.string().min(1),
  amount: z.string().min(1),
  amountUsd: z.number().nullable(),
  timestamp: z.string(),
  hopDepth: z.number().int().positive(),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).nullable(),
  createdAt: z.string(),
});

const normalizedTransactionSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  hash: z.string().min(1),
  chainId: z.number().int(),
  blockNumber: z.number().int(),
  from: z.string().regex(evmAddressRegex, "Invalid from address"),
  to: z.string().regex(evmAddressRegex, "Invalid to address"),
  asset: z.string().min(1),
  tokenAddress: z.string().nullable(),
  amount: z.string().min(1),
  amountUsd: z.number().nullable(),
  timestamp: z.string(),
  transferType: z.enum(["native", "erc20"]),
  method: z.string().nullable().optional(),
  rawProviderRef: z.string().nullable().optional(),
});

const riskFindingSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  source: z.enum(["basic-risk", "python-intelligence"]),
  type: z.string().min(1),
  severity: z.enum(["low", "medium", "high", "critical", "info"]),
  confidence: z.number().min(0).max(1),
  title: z.string().min(1),
  description: z.string().min(1),
  relatedNodeIds: z.array(z.string()),
  relatedEdgeIds: z.array(z.string()),
  signals: z.array(z.string()),
  createdAt: z.string(),
});

// ─── Request Schema (pre-flight validation before sending to Python) ──────────

/**
 * Schema for the AnalysisRequest sent to the Python Intelligence service.
 * maxDepth is replaced by the v3 traversal params:
 *   - minConfidence: 0–1 (path scoring threshold)
 *   - decayFactor: 0–1 (per-hop exponential decay)
 *   - hardCeilingDepth: positive integer, recommended ≤ 15
 */
export const analysisRequestSchema = z
  .object({
    caseId: z.string().min(1, "caseId is required"),
    analysisRequestId: z.string().min(1, "analysisRequestId is required"),
    rootAddress: z
      .string()
      .regex(
        evmAddressRegex,
        "rootAddress must be a valid 0x-prefixed 40-hex-char EVM address"
      ),
    minConfidence: z
      .number()
      .min(0, "minConfidence must be between 0 and 1")
      .max(1, "minConfidence must be between 0 and 1"),
    decayFactor: z
      .number()
      .min(0, "decayFactor must be between 0 and 1")
      .max(1, "decayFactor must be between 0 and 1"),
    hardCeilingDepth: z
      .number()
      .int()
      .positive("hardCeilingDepth must be a positive integer"),
    nodes: z.array(graphNodeSchema),
    edges: z.array(graphEdgeSchema),
    transactions: z.array(normalizedTransactionSchema),
    basicFindings: z.array(riskFindingSchema),
  })
  .superRefine((data, ctx) => {
    const nodeIds = new Set(data.nodes.map((n) => n.id));
    data.edges.forEach((edge, idx) => {
      const fromId = edge.fromNodeId || edge.from;
      const toId = edge.toNodeId || edge.to;
      if (fromId && !nodeIds.has(fromId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Edge [${idx}] fromNodeId '${fromId}' not found in nodes list`,
          path: ["edges", idx, "fromNodeId"],
        });
      }
      if (toId && !nodeIds.has(toId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Edge [${idx}] toNodeId '${toId}' not found in nodes list`,
          path: ["edges", idx, "toNodeId"],
        });
      }
    });
  });

/**
 * Validates the outbound AnalysisRequest payload before sending to the
 * Python Intelligence service.
 */
export function validatePreAnalysisRequest(payload: unknown): AnalysisRequest {
  return analysisRequestSchema.parse(payload);
}

// ─── Response Validation (post-call, before persistence) ─────────────────────

export class AnalysisResponseValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalysisResponseValidationError";
  }
}

export interface SentGraphContext {
  caseId: string;
  nodeIds: string[];
  edgeIds: string[];
}

/**
 * Validates the AnalysisResponse returned by the Python Intelligence service.
 * Throws AnalysisResponseValidationError with a descriptive message naming
 * exactly which check and which ID failed.
 *
 * Checks:
 * 1. caseId matches the request's caseId
 * 2. riskScore is a number in [0, 100]
 * 3. riskLevel is one of "low"|"medium"|"high"|"critical"
 * 4. every finding's relatedNodeIds and relatedEdgeIds exist in sentGraph
 * 5. every suspiciousPath's nodeIds and edgeIds exist in sentGraph
 * 6. IF vaspAttribution is not null: vaspNodeId, pathNodeIds, pathEdgeIds exist in sentGraph
 * 7. analysisMetadata.engineVersion is a non-empty string
 */
export function validateAnalysisResponse(
  response: unknown,
  sentGraph: SentGraphContext
): AnalysisResponse {
  if (typeof response !== "object" || response === null) {
    throw new AnalysisResponseValidationError(
      "Response validation failed: response is not an object"
    );
  }

  const r = response as Record<string, unknown>;

  // 1. caseId
  if (r["caseId"] !== sentGraph.caseId) {
    throw new AnalysisResponseValidationError(
      `Response validation failed [caseId mismatch]: expected '${sentGraph.caseId}', got '${r["caseId"]}'`
    );
  }

  // 2. riskScore
  if (
    typeof r["riskScore"] !== "number" ||
    r["riskScore"] < 0 ||
    r["riskScore"] > 100
  ) {
    throw new AnalysisResponseValidationError(
      `Response validation failed [riskScore]: expected number in [0,100], got '${r["riskScore"]}'`
    );
  }

  // 3. riskLevel
  const validRiskLevels = new Set(["low", "medium", "high", "critical"]);
  if (!validRiskLevels.has(r["riskLevel"] as string)) {
    throw new AnalysisResponseValidationError(
      `Response validation failed [riskLevel]: expected one of low|medium|high|critical, got '${r["riskLevel"]}'`
    );
  }

  const nodeIdSet = new Set(sentGraph.nodeIds);
  const edgeIdSet = new Set(sentGraph.edgeIds);

  // 4. findings — relatedNodeIds and relatedEdgeIds must reference sent graph
  const findings = r["findings"];
  if (!Array.isArray(findings)) {
    throw new AnalysisResponseValidationError(
      "Response validation failed [findings]: expected an array"
    );
  }
  for (const [fi, finding] of findings.entries()) {
    const f = finding as Record<string, unknown>;
    const relatedNodeIds = f["relatedNodeIds"];
    if (Array.isArray(relatedNodeIds)) {
      for (const nodeId of relatedNodeIds) {
        if (!nodeIdSet.has(nodeId as string)) {
          throw new AnalysisResponseValidationError(
            `Response validation failed [findings[${fi}].relatedNodeIds]: nodeId '${nodeId}' not in sent graph`
          );
        }
      }
    }
    const relatedEdgeIds = f["relatedEdgeIds"];
    if (Array.isArray(relatedEdgeIds)) {
      for (const edgeId of relatedEdgeIds) {
        if (!edgeIdSet.has(edgeId as string)) {
          throw new AnalysisResponseValidationError(
            `Response validation failed [findings[${fi}].relatedEdgeIds]: edgeId '${edgeId}' not in sent graph`
          );
        }
      }
    }
  }

  // 5. suspiciousPaths — nodeIds and edgeIds must reference sent graph
  const suspiciousPaths = r["suspiciousPaths"];
  if (!Array.isArray(suspiciousPaths)) {
    throw new AnalysisResponseValidationError(
      "Response validation failed [suspiciousPaths]: expected an array"
    );
  }
  for (const [pi, path] of suspiciousPaths.entries()) {
    const p = path as Record<string, unknown>;
    if (Array.isArray(p["nodeIds"])) {
      for (const nodeId of p["nodeIds"] as string[]) {
        if (!nodeIdSet.has(nodeId)) {
          throw new AnalysisResponseValidationError(
            `Response validation failed [suspiciousPaths[${pi}].nodeIds]: nodeId '${nodeId}' not in sent graph`
          );
        }
      }
    }
    if (Array.isArray(p["edgeIds"])) {
      for (const edgeId of p["edgeIds"] as string[]) {
        if (!edgeIdSet.has(edgeId)) {
          throw new AnalysisResponseValidationError(
            `Response validation failed [suspiciousPaths[${pi}].edgeIds]: edgeId '${edgeId}' not in sent graph`
          );
        }
      }
    }
  }

  // 6. vaspAttribution referential integrity
  const vaspAttribution = r["vaspAttribution"];
  if (vaspAttribution !== null && vaspAttribution !== undefined) {
    const va = vaspAttribution as Record<string, unknown>;

    if (typeof va["vaspNodeId"] === "string" && !nodeIdSet.has(va["vaspNodeId"])) {
      throw new AnalysisResponseValidationError(
        `Response validation failed [vaspAttribution.vaspNodeId]: '${va["vaspNodeId"]}' not in sent graph nodes`
      );
    }
    if (Array.isArray(va["pathNodeIds"])) {
      for (const nodeId of va["pathNodeIds"] as string[]) {
        if (!nodeIdSet.has(nodeId)) {
          throw new AnalysisResponseValidationError(
            `Response validation failed [vaspAttribution.pathNodeIds]: nodeId '${nodeId}' not in sent graph`
          );
        }
      }
    }
    if (Array.isArray(va["pathEdgeIds"])) {
      for (const edgeId of va["pathEdgeIds"] as string[]) {
        if (!edgeIdSet.has(edgeId)) {
          throw new AnalysisResponseValidationError(
            `Response validation failed [vaspAttribution.pathEdgeIds]: edgeId '${edgeId}' not in sent graph`
          );
        }
      }
    }
  }

  // 7. analysisMetadata.engineVersion
  const metadata = r["analysisMetadata"] as Record<string, unknown> | undefined;
  if (
    !metadata ||
    typeof metadata["engineVersion"] !== "string" ||
    metadata["engineVersion"].trim().length === 0
  ) {
    throw new AnalysisResponseValidationError(
      "Response validation failed [analysisMetadata.engineVersion]: must be a non-empty string"
    );
  }

  return response as AnalysisResponse;
}
