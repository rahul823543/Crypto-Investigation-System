import { Worker, Job } from "bullmq";
import { Redis } from "ioredis";
import pg from "pg";
import { randomUUID } from "node:crypto";

import { PrismaClient } from "../generated/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { analyzeCase, IntelligenceClientError } from "../modules/analysis/intelligence.client.js";
import {
  validatePreAnalysisRequest,
  validateAnalysisResponse,
  AnalysisResponseValidationError,
} from "../modules/analysis/analysis.validation.js";
import type {
  AnalysisRequest,
  GraphNode,
  GraphEdge,
  RiskFinding,
  NormalizedTransaction,
  TransferType,
  RiskLevel,
  FindingSeverity,
  FindingSource,
} from "@sih/shared-types";

export interface AnalyzeCaseJobData {
  caseId: string;
  minConfidence?: number;
  decayFactor?: number;
  hardCeilingDepth?: number;
}

export function createAnalyzeWorker(
  redisUrl: string,
  databaseUrl: string,
  intelligenceApiUrl: string
) {
  const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });

  connection.on("error", (err) => {
    console.error("Redis connection error in analyzeCase worker:", err);
  });

  const pool = new pg.Pool({
    connectionString: databaseUrl,
  });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const worker = new Worker<AnalyzeCaseJobData>(
    "analyze-case",
    async (job: Job<AnalyzeCaseJobData>) => {
      const {
        caseId,
        minConfidence = 0.3,
        decayFactor = 0.85,
        hardCeilingDepth = 10,
      } = job.data;

      await prisma.case.update({
        where: { id: caseId },
        data: { status: "analyzing" },
      });

      try {
        const caseRecord = await prisma.case.findUnique({
          where: { id: caseId },
          include: {
            graphNodes: true,
            graphEdges: true,
            transactions: {
              orderBy: { timestamp: "asc" },
            },
            riskFindings: true,
          },
        });

        if (!caseRecord) {
          throw new Error(`Case not found: ${caseId}`);
        }

        const nodes: GraphNode[] = caseRecord.graphNodes.map((n) => ({
          id: n.id,
          caseId: n.caseId,
          address: n.address,
          type: n.type as any,
          labels: JSON.parse(n.labelsJson || "[]"),
          riskLevel: (n.riskLevel as RiskLevel) ?? "low",
          totalInUsd: n.totalInUsd,
          totalOutUsd: n.totalOutUsd,
          isTraceableDeadEnd: n.isTraceableDeadEnd,
          outDegree: n.outDegree,
          createdAt: n.createdAt.toISOString(),
        }));

        const edges: GraphEdge[] = caseRecord.graphEdges.map((e) => ({
          id: e.id,
          caseId: e.caseId,
          fromNodeId: e.fromNodeId,
          toNodeId: e.toNodeId,
          from: e.fromNodeId,
          to: e.toNodeId,
          transactionHash: e.transactionHash,
          asset: e.asset,
          amount: e.amount,
          amountUsd: e.amountUsd ?? 0.0,
          timestamp: e.timestamp.toISOString(),
          hopDepth: e.hopDepth,
          riskLevel: (e.riskLevel as RiskLevel) ?? "low",
          createdAt: e.createdAt.toISOString(),
        }));

        const transactions: NormalizedTransaction[] = caseRecord.transactions.map((tx) => ({
          id: tx.id,
          caseId: tx.caseId,
          hash: tx.hash,
          chainId: tx.chainId,
          blockNumber: tx.blockNumber,
          from: tx.fromAddress,
          to: tx.toAddress,
          asset: tx.asset,
          tokenAddress: tx.tokenAddress,
          amount: tx.amount,
          amountUsd: tx.amountUsd ?? 0.0,
          timestamp: tx.timestamp.toISOString(),
          transferType: tx.transferType as TransferType,
          method: tx.method,
          rawProviderRef: tx.rawProviderRef,
        }));

        const basicFindings: RiskFinding[] = caseRecord.riskFindings.map((f) => ({
          id: f.id,
          caseId: f.caseId,
          source: f.source as FindingSource,
          type: f.type,
          severity: f.severity as FindingSeverity,
          confidence: f.confidence,
          title: f.title,
          description: f.description,
          relatedNodeIds: JSON.parse(f.relatedNodeIdsJson || "[]"),
          relatedEdgeIds: JSON.parse(f.relatedEdgeIdsJson || "[]"),
          signals: JSON.parse(f.signalsJson || "[]"),
          createdAt: f.createdAt.toISOString(),
        }));

        const rawPayload: AnalysisRequest = {
          caseId,
          analysisRequestId: randomUUID(),
          rootAddress: caseRecord.rootAddress,
          minConfidence,
          decayFactor,
          hardCeilingDepth,
          nodes,
          edges,
          transactions,
          basicFindings,
        };

        const validatedPayload = validatePreAnalysisRequest(rawPayload);

        // Translation at the Python request boundary: send `from`/`to` instead of `fromNodeId`/`toNodeId`
        const outgoingPayload = {
          ...validatedPayload,
          edges: validatedPayload.edges.map((e) => {
            const { fromNodeId, toNodeId, ...rest } = e;
            return {
              ...rest,
              from: e.from ?? fromNodeId,
              to: e.to ?? toNodeId,
            };
          }),
        };

        const rawResponse = await analyzeCase(outgoingPayload as any, intelligenceApiUrl);

        // Validate response referential integrity before persisting anything
        const sentGraph = {
          caseId,
          nodeIds: nodes.map((n) => n.id),
          edgeIds: edges.map((e) => e.id),
        };
        const response = validateAnalysisResponse(rawResponse, sentGraph);

        await prisma.$transaction(async (tx) => {
          // Persist AnalysisResult
          await tx.analysisResult.create({
            data: {
              caseId,
              analysisRequestId: validatedPayload.analysisRequestId,
              riskScore: response.riskScore,
              riskLevel: response.riskLevel,
              suspiciousPathsJson: JSON.stringify(response.suspiciousPaths),
              circularFlowsJson: JSON.stringify(response.circularFlows),
              attributedVaspJson: response.vaspAttribution
                ? JSON.stringify(response.vaspAttribution)
                : null,
              metadataJson: JSON.stringify(response.analysisMetadata),
            },
          });

          // Persist new findings from intelligence engine
          if (response.findings.length > 0) {
            await tx.riskFinding.createMany({
              data: response.findings.map((f) => ({
                id: f.id || randomUUID(),
                caseId,
                source: "python-intelligence",
                type: f.type,
                severity: f.severity,
                confidence: f.confidence,
                title: f.title,
                description: f.description,
                relatedNodeIdsJson: JSON.stringify(f.relatedNodeIds),
                relatedEdgeIdsJson: JSON.stringify(f.relatedEdgeIds),
                signalsJson: JSON.stringify(f.signals),
              })),
              skipDuplicates: true,
            });
          }

          // Update case status to analyzed
          await tx.case.update({
            where: { id: caseId },
            data: {
              status: "analyzed",
              riskScore: response.riskScore,
              riskLevel: response.riskLevel,
            },
          });
        });
      } catch (err: unknown) {
        const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
        // Response validation failures are non-retryable (Python returned bad data)
        const isNonRetryable =
          err instanceof AnalysisResponseValidationError ||
          (err instanceof IntelligenceClientError && !err.isRetryable);

        if (isLastAttempt || isNonRetryable) {
          await prisma.case.update({
            where: { id: caseId },
            data: {
              status: "failed",
              errorMessage:
                err instanceof Error
                  ? err.message
                  : "Unknown analysis error",
            },
          });
        }

        throw err;
      }
    },
    {
      connection,
    }
  );

  worker.on("completed", (job) => {
    console.log(`Analysis completed for case ${job.data.caseId}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Analysis failed for case ${job?.data.caseId}:`, err.message);

    // BullMQ emits this event for retryable failures too. Only use it as a
    // fallback after the final attempt; the processor catch keeps the normal
    // lifecycle state accurate during exponential backoff.
    const attempts = job?.opts.attempts ?? 1;
    if (!job?.data.caseId || job.attemptsMade < attempts) {
      return;
    }

    void prisma
      .case
      .update({
        where: { id: job.data.caseId },
        data: {
          status: "failed",
          errorMessage: err.message || "Analysis failed after retries",
        },
      })
      .catch((updateErr) => {
        console.error("Failed to update case status on job failure:", updateErr);
      });
  });

  worker.on("error", (err) => {
    console.error("Analyze worker error:", err);
  });

  let isShuttingDown = false;

  const shutdown = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    try {
      await worker.close();
    } finally {
      try {
        await prisma.$disconnect();
      } finally {
        try {
          await pool.end();
        } finally {
          connection.disconnect();
        }
      }
    }
  };

  return {
    worker,
    shutdown,
  };
}
