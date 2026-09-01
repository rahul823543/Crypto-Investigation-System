import type { FastifyInstance } from "fastify";
import type {
  Case,
  CaseMode,
  CaseStatus,
  NormalizedTransaction,
  RiskLevel,
  TransferType,
} from "@sih/shared-types";

import type { CreateCaseInput } from "./cases.schema.js";

function toCaseDto(caseRecord: {
  id: string;
  rootAddress: string;
  chainId: number;
  mode: string;
  status: string;
  riskScore: number | null;
  riskLevel: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Case {
  return {
    id: caseRecord.id,
    rootAddress: caseRecord.rootAddress,
    chainId: caseRecord.chainId,
    mode: caseRecord.mode as CaseMode,
    status: caseRecord.status as CaseStatus,
    riskScore: caseRecord.riskScore,
    riskLevel: caseRecord.riskLevel as RiskLevel | null,
    errorMessage: caseRecord.errorMessage,
    createdAt: caseRecord.createdAt.toISOString(),
    updatedAt: caseRecord.updatedAt.toISOString(),
  };
}

export async function createCase(
  app: FastifyInstance,
  input: CreateCaseInput
): Promise<Case> {
  const caseRecord = await app.prisma.case.create({
    data: {
      rootAddress: input.rootAddress,
      chainId: input.chainId as number,
      mode: input.mode,
      status: "created",
    },
  });

  try {
    await app.ingestQueue.add(
      "ingest-case-transactions",
      {
        caseId: caseRecord.id,
        rootAddress: caseRecord.rootAddress,
        chainId: caseRecord.chainId,
        mode: caseRecord.mode,
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
      }
    );
  } catch (err) {
    await app.prisma.case.update({
      where: {
        id: caseRecord.id,
      },
      data: {
        status: "failed",
        errorMessage: "Failed to enqueue ingestion job",
      },
    });

    throw err;
  }

  return toCaseDto(caseRecord);
}

export async function getCaseById(
  app: FastifyInstance,
  caseId: string
): Promise<Case | null> {
  app.log.info({ caseId }, "Looking up case");

  const result = await app.prisma.case.findUnique({
    where: {
      id: caseId,
    },
  });

  if (!result) {
    app.log.info({ caseId }, "Case not found");
    return null;
  }

  app.log.info({ caseId }, "Case found");

  return toCaseDto(result);
}

export interface GetCasesOptions {
  status?: string;
  limit?: number;
  cursor?: string;
}

export async function getCases(
  app: FastifyInstance,
  options: GetCasesOptions
): Promise<{ cases: Case[]; nextCursor: string | null }> {
  const limit = Math.min(options.limit ?? 20, 100);

  const cases = await app.prisma.case.findMany({
    where: {
      ...(options.status ? { status: options.status } : {}),
      ...(options.cursor ? { createdAt: { lt: new Date(options.cursor) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1, // fetch one extra to determine if there is a next page
  });

  const hasNextPage = cases.length > limit;
  const page = hasNextPage ? cases.slice(0, limit) : cases;
  const nextCursor =
    hasNextPage ? page[page.length - 1]!.createdAt.toISOString() : null;

  return {
    cases: page.map(toCaseDto),
    nextCursor,
  };
}

function toTransactionDto(tx: {
  id: string;
  caseId: string;
  hash: string;
  chainId: number;
  blockNumber: number;
  fromAddress: string;
  toAddress: string;
  asset: string;
  tokenAddress: string | null;
  amount: string;
  amountUsd: number | null;
  timestamp: Date;
  transferType: string;
  method: string | null;
  rawProviderRef: string | null;
}): NormalizedTransaction {
  return {
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
  };
}

export async function getCaseTransactions(
  app: FastifyInstance,
  caseId: string
): Promise<NormalizedTransaction[] | null> {
  app.log.info({ caseId }, "Looking up transactions for case");

  // Return null (→ 404) if the case itself doesn't exist.
  const caseRecord = await app.prisma.case.findUnique({ where: { id: caseId } });
  if (!caseRecord) {
    return null;
  }

  const rows = await app.prisma.transaction.findMany({
    where: { caseId },
    orderBy: { timestamp: "asc" },
  });

  return rows.map(toTransactionDto);
}