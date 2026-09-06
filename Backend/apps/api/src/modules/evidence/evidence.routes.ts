import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  storeEvidenceOnChain,
  getEvidenceOnChain,
} from "../../clients/ethers.client.js";
import { hashBuffer } from "./hash.service.js";

const evidenceBodySchema = z.object({
  reportId: z.string().min(1, "reportId is required"),
});

const verifyBodySchema = z.object({
  caseId: z.string().min(1, "caseId is required"),
  reportId: z.string().min(1, "reportId is required"),
});

export async function evidenceRoutes(app: FastifyInstance) {
  /**
   * POST /cases/:caseId/evidence
   * Anchors a forensic report on-chain as cryptographic evidence.
   */
  app.post<{
    Params: { caseId: string };
    Body: { reportId: string };
  }>("/cases/:caseId/evidence", async (request, reply) => {
    const { caseId } = request.params;
    const bodyResult = evidenceBodySchema.safeParse(request.body);

    if (!bodyResult.success) {
      const fieldErrors = bodyResult.error.flatten().fieldErrors;
      const message = Object.entries(fieldErrors)
        .map(([field, errs]) => `${field}: ${errs?.join(", ")}`)
        .join("; ") || "Validation failed";
      return reply.status(400).send({
        error: "Invalid request body",
        message,
        statusCode: 400,
      });
    }

    const { reportId } = bodyResult.data;

    // Verify case exists
    const caseRecord = await app.prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseRecord) {
      return reply.status(404).send({
        error: "Case not found",
        statusCode: 404,
      });
    }

    // Load the Report row and its sha256Hash
    const report = await app.prisma.report.findFirst({
      where: { id: reportId, caseId },
    });

    if (!report) {
      return reply.status(404).send({
        error: "Report not found",
        statusCode: 404,
      });
    }

    const caseKeyHash = hashBuffer(Buffer.from(caseId));
    const reportHash = report.sha256Hash;

    const existingCount = await app.prisma.evidenceRecord.count({
      where: { caseId },
    });
    const version = existingCount + 1;

    let transactionHash: string | null = null;
    let verificationStatus = "storage_failed";
    const contractAddress = app.config?.EVIDENCE_CONTRACT_ADDRESS ?? null;
    const chainId = app.config?.EVIDENCE_CHAIN_ID ?? null;

    try {
      const result = await storeEvidenceOnChain(caseId, reportHash, {
        contractAddress: app.config?.EVIDENCE_CONTRACT_ADDRESS,
        rpcUrl: app.config?.EVIDENCE_RPC_URL,
        privateKey: app.config?.RELAYER_PRIVATE_KEY,
        chainId: app.config?.EVIDENCE_CHAIN_ID,
      });

      transactionHash = result.transactionHash;
      verificationStatus = "confirmed";
    } catch (err) {
      app.log.warn(
        { err, caseId, reportId },
        "On-chain evidence anchoring failed or not configured; saving record as storage_failed"
      );
    }

    const evidenceRecord = await app.prisma.evidenceRecord.create({
      data: {
        caseId,
        reportId,
        caseKeyHash,
        reportHash,
        contractAddress,
        transactionHash,
        chainId,
        version,
        storedAt: new Date(),
        verificationStatus,
      },
    });

    return reply.status(200).send({
      evidenceRecord,
    });
  });

  /**
   * POST /evidence/verify
   * Verifies a stored report hash against the on-chain evidence registry.
   */
  app.post<{
    Body: { caseId: string; reportId: string };
  }>("/evidence/verify", async (request, reply) => {
    const bodyResult = verifyBodySchema.safeParse(request.body);

    if (!bodyResult.success) {
      const fieldErrors = bodyResult.error.flatten().fieldErrors;
      const message = Object.entries(fieldErrors)
        .map(([field, errs]) => `${field}: ${errs?.join(", ")}`)
        .join("; ") || "Validation failed";
      return reply.status(400).send({
        error: "Invalid request body",
        message,
        statusCode: 400,
      });
    }

    const { caseId, reportId } = bodyResult.data;

    const caseRecord = await app.prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseRecord) {
      return reply.status(404).send({
        error: "Case not found",
        statusCode: 404,
      });
    }

    const report = await app.prisma.report.findFirst({
      where: { id: reportId, caseId },
    });

    if (!report) {
      return reply.status(404).send({
        error: "Report not found",
        statusCode: 404,
      });
    }

    const evidenceRecord = await app.prisma.evidenceRecord.findFirst({
      where: { reportId, caseId },
      orderBy: { storedAt: "desc" },
    });

    const computedHash = report.sha256Hash;
    const contractAddress =
      evidenceRecord?.contractAddress ??
      app.config?.EVIDENCE_CONTRACT_ADDRESS ??
      null;
    const transactionHash = evidenceRecord?.transactionHash ?? null;
    const chainId =
      evidenceRecord?.chainId ??
      (app.config?.EVIDENCE_CHAIN_ID
        ? Number(app.config.EVIDENCE_CHAIN_ID)
        : null);
    const version = evidenceRecord?.version ?? null;
    const storedAt = evidenceRecord?.storedAt
      ? evidenceRecord.storedAt.toISOString()
      : null;

    if (
      !evidenceRecord ||
      evidenceRecord.verificationStatus === "storage_failed" ||
      !evidenceRecord.transactionHash
    ) {
      return reply.status(200).send({
        caseId,
        reportId,
        computedHash,
        onChainHash: null,
        verified: false,
        reason: "no evidence stored on-chain for this report",
        contractAddress,
        transactionHash,
        chainId,
        version,
        storedAt,
      });
    }

    let onChainHash: string | null = null;
    try {
      onChainHash = await getEvidenceOnChain(caseId, {
        contractAddress: app.config?.EVIDENCE_CONTRACT_ADDRESS,
        rpcUrl: app.config?.EVIDENCE_RPC_URL,
        chainId: app.config?.EVIDENCE_CHAIN_ID,
      });
    } catch (err: any) {
      app.log.warn(
        { err, caseId, reportId },
        "On-chain read verification failed or contract not configured"
      );
      const isUnconfigured =
        err?.message?.includes("not configured") ||
        !app.config?.EVIDENCE_CONTRACT_ADDRESS ||
        !app.config?.EVIDENCE_RPC_URL;
      return reply.status(200).send({
        caseId,
        reportId,
        computedHash,
        onChainHash: null,
        verified: false,
        reason: isUnconfigured
          ? "contract not configured"
          : `on-chain read failed: ${err instanceof Error ? err.message : String(err)}`,
        contractAddress,
        transactionHash,
        chainId,
        version,
        storedAt,
      });
    }

    if (!onChainHash) {
      return reply.status(200).send({
        caseId,
        reportId,
        computedHash,
        onChainHash: null,
        verified: false,
        reason: "no evidence stored on-chain for this report",
        contractAddress,
        transactionHash,
        chainId,
        version,
        storedAt,
      });
    }

    const verified =
      computedHash.toLowerCase() === onChainHash.toLowerCase();

    return reply.status(200).send({
      caseId,
      reportId,
      computedHash,
      onChainHash,
      verified,
      contractAddress,
      transactionHash,
      chainId,
      version,
      storedAt,
    });
  });

  /**
   * GET /cases/:caseId/evidence
   * Lists all evidence records for a case.
   */
  app.get<{ Params: { caseId: string } }>(
    "/cases/:caseId/evidence",
    async (request, reply) => {
      const { caseId } = request.params;

      try {
        const evidenceRecords = await app.prisma.evidenceRecord.findMany({
          where: { caseId },
          orderBy: { storedAt: "desc" },
        });

        return reply.send({ evidenceRecords });
      } catch (err) {
        app.log.error(
          err,
          `Failed to fetch evidence records for case ${caseId}`
        );
        return reply.status(500).send({
          error: "Failed to fetch evidence records",
          statusCode: 500,
        });
      }
    }
  );
}

