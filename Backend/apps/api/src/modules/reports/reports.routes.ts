import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { generateReportPdf } from "./report.generator.js";
import { hashBuffer } from "../evidence/hash.service.js";

export async function reportsRoutes(app: FastifyInstance) {
  /**
   * POST /cases/:caseId/reports
   * Generates a forensic PDF report for the case, computes its SHA-256 hash,
   * writes the PDF to disk, and records metadata in the Report table.
   */
  app.post<{ Params: { caseId: string } }>(
    "/cases/:caseId/reports",
    async (request, reply) => {
      const { caseId } = request.params;

      try {
        const caseRecord = await app.prisma.case.findUnique({
          where: { id: caseId },
        });

        if (!caseRecord) {
          return reply.status(404).send({
            error: "Case not found",
            statusCode: 404,
          });
        }

        // Generate PDF Buffer
        const pdfBuffer = await generateReportPdf(caseId, app.prisma);

        // Compute SHA-256 Hash
        const sha256Hash = hashBuffer(pdfBuffer);

        // Determine version number
        const existingCount = await app.prisma.report.count({
          where: { caseId },
        });
        const version = existingCount + 1;

        // Ensure storage directory exists
        const storageDir = path.resolve(process.cwd(), "storage", "reports");
        await fs.mkdir(storageDir, { recursive: true });

        const fileName = `${caseId}-v${version}.pdf`;
        const absoluteFilePath = path.join(storageDir, fileName);
        const relativeFilePath = `storage/reports/${fileName}`;

        // Write PDF file to disk
        await fs.writeFile(absoluteFilePath, pdfBuffer);

        // Persist Report record
        const report = await app.prisma.report.create({
          data: {
            caseId,
            status: "generated",
            filePath: relativeFilePath,
            sha256Hash,
            version,
          },
        });

        return reply.status(201).send({
          report: {
            id: report.id,
            caseId: report.caseId,
            status: report.status,
            filePath: report.filePath,
            sha256Hash: report.sha256Hash,
            version: report.version,
            generatedAt: report.generatedAt,
          },
        });
      } catch (err) {
        app.log.error(err, `Failed to generate report for case ${caseId}`);
        return reply.status(500).send({
          error: "Failed to generate report",
          message: err instanceof Error ? err.message : String(err),
          statusCode: 500,
        });
      }
    }
  );

  /**
   * GET /cases/:caseId/reports
   * List all generated reports for a case.
   */
  app.get<{ Params: { caseId: string } }>(
    "/cases/:caseId/reports",
    async (request, reply) => {
      const { caseId } = request.params;

      try {
        const reports = await app.prisma.report.findMany({
          where: { caseId },
          orderBy: { version: "desc" },
        });

        return reply.send({ reports });
      } catch (err) {
        app.log.error(err, `Failed to fetch reports for case ${caseId}`);
        return reply.status(500).send({
          error: "Failed to fetch reports",
          statusCode: 500,
        });
      }
    }
  );
}
