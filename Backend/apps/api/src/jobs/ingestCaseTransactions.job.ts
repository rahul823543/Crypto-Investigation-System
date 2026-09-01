import { Worker, Job } from "bullmq";
import { Redis } from "ioredis";
import pg from "pg";

import { PrismaClient } from "../generated/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

import { fetchWalletTransfers } from "../modules/blockchain/providers/evmProvider.client.js";
import { normalizeTransfers } from "../modules/blockchain/normalizeTransactions.js";

import type { NormalizedTransactionInput } from "@sih/shared-types";

import seededCase from "../../datasets/seeded-case.json" with {
  type: "json",
};

interface IngestJobData {
  caseId: string;
  rootAddress: string;
  chainId: number;
  mode: "demo" | "live";
}

interface SeededCaseFile {
  case: unknown;
  transactions?: NormalizedTransactionInput[];
}

async function persistTransactions(
  prisma: PrismaClient,
  caseId: string,
  transactions: NormalizedTransactionInput[]
) {
  if (transactions.length === 0) return;

  await prisma.transaction.createMany({
    data: transactions.map((tx) => ({
      caseId,
      hash: tx.hash,
      chainId: tx.chainId,
      blockNumber: tx.blockNumber,
      fromAddress: tx.from,
      toAddress: tx.to,
      asset: tx.asset,
      tokenAddress: tx.tokenAddress,
      amount: tx.amount,
      amountUsd: tx.amountUsd,
      timestamp: new Date(tx.timestamp),
      transferType: tx.transferType,
      method: tx.method,
      rawProviderRef: tx.rawProviderRef ?? null,
    })),
    skipDuplicates: true,
  });
}

export function createIngestWorker(
  redisUrl: string,
  alchemyApiUrl: string,
  databaseUrl: string
) {
  const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });

  connection.on("error", (err) => {
    console.error("Redis connection error in ingest worker:", err);
  });

  const pool = new pg.Pool({
    connectionString: databaseUrl,
  });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const worker = new Worker<IngestJobData>(
    "ingest-case-transactions",
    async (job: Job<IngestJobData>) => {
      const { caseId, rootAddress, chainId, mode } = job.data;

      await prisma.case.update({
        where: { id: caseId },
        data: { status: "ingesting" },
      });

      try {
        const { transfers } = await fetchWalletTransfers({
          address: rootAddress,
          alchemyApiUrl,
        });

        const normalized = normalizeTransfers(transfers, chainId);

        // In demo mode, an empty live result should use the seeded dataset.
        if (mode === "demo" && normalized.length === 0) {
          throw new Error(
            "No live transfers found for demo address, triggering seeded fallback"
          );
        }

        await persistTransactions(prisma, caseId, normalized);

        await prisma.case.update({
          where: { id: caseId },
          data: { status: "ingested" },
        });
      } catch (err) {
        if (mode === "demo") {
          const seededTransactions = (
            (seededCase as SeededCaseFile).transactions ?? []
          ).map((tx) => ({ ...tx, chainId }));

          await persistTransactions(
            prisma,
            caseId,
            seededTransactions
          );

          await prisma.case.update({
            where: { id: caseId },
            data: {
              status: "demo_fallback_used",
            },
          });

          return;
        }

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
                  : "Unknown ingestion error",
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
    console.log(
      `Ingestion completed for case ${job.data.caseId}`
    );
  });

  worker.on("failed", (job, err) => {
    console.error(
      `Ingestion failed for case ${job?.data.caseId}:`,
      err.message
    );
  });

  worker.on("error", (err) => {
    console.error("Ingest worker error:", err);
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