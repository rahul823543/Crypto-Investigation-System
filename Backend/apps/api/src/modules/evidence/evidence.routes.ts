import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { storeEvidenceOnChain } from "../../clients/ethers.client.js";
import { hashBuffer } from "./hash.service.js";

const evidenceBodySchema = z.object({
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
      return reply.status(400).send({
        error: "Invalid request body",
        details: bodyResult.error.flatten().fieldErrors,
      });
    }

    const { reportId } = bodyResult.data;

    // Verify case exists
    const caseRecord = await app.prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseRecord) {
      return reply.status(404).send({ error: "Case not found" });
    }

    // Load the Report row and its sha256Hash
    const report = await app.prisma.report.findFirst({
      where: { id: reportId, caseId },
    });

    if (!report) {
      return reply.status(404).send({ error: "Report not found" });
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
        app.log.error(err, `Failed to fetch evidence records for case ${caseId}`);
        return reply
          .status(500)
          .send({ error: "Failed to fetch evidence records" });
      }
    }
  );
}
