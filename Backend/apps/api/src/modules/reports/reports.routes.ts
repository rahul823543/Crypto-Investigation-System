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

      app.log.info({ caseId }, "[report:generate] Starting report generation");

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

        app.log.info(
          { caseId, status: caseRecord.status },
          "[report:generate] Case found, invoking PDF generator"
        );

        // Generate PDF Buffer
        const pdfBuffer = await generateReportPdf(caseId, app.prisma);

        app.log.info(
          { caseId, bytes: pdfBuffer.length },
          "[report:generate] PDF buffer produced"
        );

        if (pdfBuffer.length === 0) {
          throw new Error(
            "PDF generation produced an empty buffer — pdfkit emitted no data chunks"
          );
        }

        // Compute SHA-256 Hash
        const sha256Hash = hashBuffer(pdfBuffer);

        app.log.info(
          { caseId, sha256Hash },
          "[report:generate] SHA-256 hash computed"
        );

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

        app.log.info(
          { caseId, absoluteFilePath, bytes: pdfBuffer.length },
          "[report:generate] PDF written to disk"
        );

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

        app.log.info(
          { caseId, reportId: report.id, version },
          "[report:generate] Report record persisted"
        );

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
        app.log.error(
          { err, caseId },
          `[report:generate] Failed to generate report for case ${caseId}`
        );

        // Mark case as report_failed so the pipeline never silently stalls
        try {
          await app.prisma.case.update({
            where: { id: caseId },
            data: {
              status: "report_failed",
              errorMessage:
                err instanceof Error
                  ? err.message
                  : "Report generation failed",
            },
          });
        } catch (updateErr) {
          app.log.error(
            { updateErr, caseId },
            "[report:generate] Could not update case status to report_failed"
          );
        }

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

  /**
   * GET /cases/:caseId/reports/:reportId/file
   * Downloads the generated PDF file for a specific report.
   * Returns the raw binary with Content-Type: application/pdf.
   */
  app.get<{ Params: { caseId: string; reportId: string } }>(
    "/cases/:caseId/reports/:reportId/file",
    async (request, reply) => {
      const { caseId, reportId } = request.params;

      app.log.info(
        { caseId, reportId },
        "[report:download] PDF download requested"
      );

      try {
        const report = await app.prisma.report.findFirst({
          where: { id: reportId, caseId },
        });

        if (!report) {
          return reply.status(404).send({
            error: "Report not found",
            message: `No report with id ${reportId} exists for case ${caseId}`,
            statusCode: 404,
          });
        }

        if (!report.filePath) {
          return reply.status(404).send({
            error: "Report file not available",
            message: "Report record exists but no file path was recorded",
            statusCode: 404,
          });
        }

        // filePath is stored relative to cwd (e.g. "storage/reports/<name>.pdf")
        const absoluteFilePath = path.resolve(process.cwd(), report.filePath);

        app.log.info(
          { caseId, reportId, absoluteFilePath },
          "[report:download] Resolved absolute file path"
        );

        // Guard: confirm the file is actually present on disk
        try {
          await fs.access(absoluteFilePath);
        } catch {
          app.log.error(
            { caseId, reportId, absoluteFilePath },
            "[report:download] PDF file is missing from disk"
          );
          return reply.status(404).send({
            error: "Report file missing",
            message:
              "The PDF exists in the database but is no longer on disk — regenerate the report",
            statusCode: 404,
          });
        }

        const fileBuffer = await fs.readFile(absoluteFilePath);
        const fileName = path.basename(absoluteFilePath);

        app.log.info(
          { caseId, reportId, bytes: fileBuffer.length },
          "[report:download] Serving PDF to client"
        );

        return reply
          .status(200)
          .header("Content-Type", "application/pdf")
          .header("Content-Disposition", `attachment; filename="${fileName}"`)
          .header("Content-Length", fileBuffer.length.toString())
          .header("X-SHA256", report.sha256Hash ?? "")
          .send(fileBuffer);
      } catch (err) {
        app.log.error(
          { err, caseId, reportId },
          "[report:download] Failed to serve report file"
        );
        return reply.status(500).send({
          error: "Failed to serve report file",
          message: err instanceof Error ? err.message : String(err),
          statusCode: 500,
        });
      }
    }
  );
}

