import { Worker, Job } from "bullmq";
import { Redis } from "ioredis";
import pg from "pg";

import { PrismaClient } from "../generated/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

import { buildGraph } from "../modules/graph/graph.builder.js";
import { runRiskDetectors } from "../modules/risk/risk.detector.js";
import { calculateRiskScore } from "../modules/risk/riskScore.js";
import defaultAddressLabels from "../datasets/address-labels.json" with {
  type: "json",
};
import type {
  NormalizedTransaction,
  TransferType,
  AddressLabel,
} from "@sih/shared-types";

export interface BuildGraphJobData {
  caseId: string;
}

export function createBuildGraphWorker(
  redisUrl: string,
  databaseUrl: string
) {
  const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });

  connection.on("error", (err) => {
    console.error("Redis connection error in buildGraph worker:", err);
  });

  const pool = new pg.Pool({
    connectionString: databaseUrl,
  });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const worker = new Worker<BuildGraphJobData>(
    "build-case-graph",
    async (job: Job<BuildGraphJobData>) => {
      const { caseId } = job.data;

      await prisma.case.update({
        where: { id: caseId },
        data: { status: "graph_building" },
      });

      try {
        const caseRecord = await prisma.case.findUnique({
          where: { id: caseId },
          include: {
            transactions: {
              orderBy: { timestamp: "asc" },
            },
          },
        });

        if (!caseRecord) {
          throw new Error(`Case not found: ${caseId}`);
        }

        const normalizedTransactions: NormalizedTransaction[] =
          caseRecord.transactions.map((tx) => ({
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
            amountUsd: tx.amountUsd,
            timestamp: tx.timestamp.toISOString(),
            transferType: tx.transferType as TransferType,
            method: tx.method,
            rawProviderRef: tx.rawProviderRef,
          }));

        const addressLabels = defaultAddressLabels as AddressLabel[];

        const { nodes, edges } = await buildGraph({
          caseId,
          rootAddress: caseRecord.rootAddress,
          transactions: normalizedTransactions,
          addressLabels,
        });

        const findings = runRiskDetectors({
          caseId,
          rootAddress: caseRecord.rootAddress,
          nodes,
          edges,
          transactions: normalizedTransactions,
          addressLabels,
        });

        const { riskScore, riskLevel } = calculateRiskScore(findings);

        await prisma.$transaction(async (tx) => {
          if (nodes.length > 0) {
            await tx.graphNode.createMany({
              data: nodes.map((node) => ({
                id: node.id,
                caseId,
                address: node.address,
                type: node.type,
                labelsJson: JSON.stringify(node.labels),
                riskLevel: node.riskLevel,
                totalInUsd: node.totalInUsd,
                totalOutUsd: node.totalOutUsd,
              })),
              skipDuplicates: true,
            });
          }

          if (edges.length > 0) {
            await tx.graphEdge.createMany({
              data: edges.map((edge) => ({
                id: edge.id,
                caseId,
                fromNodeId: edge.fromNodeId,
                toNodeId: edge.toNodeId,
                transactionHash: edge.transactionHash,
                asset: edge.asset,
                amount: edge.amount,
                amountUsd: edge.amountUsd,
                timestamp: new Date(edge.timestamp),
                hopDepth: edge.hopDepth,
                riskLevel: edge.riskLevel,
              })),
              skipDuplicates: true,
            });
          }

          if (findings.length > 0) {
            await tx.riskFinding.createMany({
              data: findings.map((f) => ({
                id: f.id,
                caseId,
                source: f.source,
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

          // Step 8: Upsert unique addresses into Wallet table
          for (const node of nodes) {
            const labelStr = node.labels.length > 0 ? node.labels.join(", ") : null;
            await tx.wallet.upsert({
              where: {
                address_chainId: {
                  address: node.address,
                  chainId: caseRecord.chainId,
                },
              },
              create: {
                address: node.address,
                chainId: caseRecord.chainId,
                label: labelStr,
                type: node.type,
                riskLevel: node.riskLevel,
              },
              update: {
                label: labelStr,
                type: node.type,
                riskLevel: node.riskLevel,
              },
            });
          }

          await tx.case.update({
            where: { id: caseId },
            data: {
              status: "graph_ready",
              riskScore,
              riskLevel,
            },
          });
        });
      } catch (err) {
        const isLastAttempt =
          job.attemptsMade + 1 >= (job.opts.attempts ?? 1);

        if (isLastAttempt) {
          await prisma.case.update({
            where: { id: caseId },
            data: {
              status: "failed",
              errorMessage:
                err instanceof Error
                  ? err.message
                  : "Unknown graph building error",
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
    console.log(`Graph build completed for case ${job.data.caseId}`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `Graph build failed for case ${job?.data.caseId}:`,
      err.message
    );
  });

  worker.on("error", (err) => {
    console.error("Build graph worker error:", err);
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
