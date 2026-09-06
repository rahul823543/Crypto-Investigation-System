import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type {
  RiskFinding,
  FindingSeverity,
  FindingSource,
} from "@sih/shared-types";

const listFindingsQuerySchema = z.object({
  source: z.string().optional(),
});

export async function riskRoutes(app: FastifyInstance) {
  /**
   * GET /cases/:caseId/findings
   * Return persisted RiskFinding rows for a case, with optional source filter.
   * Returns 404 if the case does not exist.
   */
  app.get<{
    Params: { caseId: string };
    Querystring: { source?: string };
  }>("/cases/:caseId/findings", async (request, reply) => {
    const queryResult = listFindingsQuerySchema.safeParse(request.query);

    if (!queryResult.success) {
      const fieldErrors = queryResult.error.flatten().fieldErrors;
      const message =
        Object.entries(fieldErrors)
          .map(([field, errs]) => `${field}: ${errs?.join(", ")}`)
          .join("; ") || "Invalid query parameters";
      return reply.status(400).send({
        error: "Invalid query parameters",
        message,
        statusCode: 400,
      });
    }

    try {
      const { caseId } = request.params;
      const { source } = queryResult.data;

      const caseRecord = await app.prisma.case.findUnique({
        where: { id: caseId },
      });

      if (!caseRecord) {
        return reply.status(404).send({
          error: "Case not found",
          statusCode: 404,
        });
      }

      const findings = await app.prisma.riskFinding.findMany({
        where: {
          caseId,
          ...(source ? { source } : {}),
        },
        orderBy: { createdAt: "desc" },
      });

      const mappedFindings: RiskFinding[] = findings.map((f) => {
        let relatedNodeIds: string[] = [];
        let relatedEdgeIds: string[] = [];
        let signals: string[] = [];

        try {
          relatedNodeIds = JSON.parse(f.relatedNodeIdsJson);
        } catch {
          relatedNodeIds = [];
        }

        try {
          relatedEdgeIds = JSON.parse(f.relatedEdgeIdsJson);
        } catch {
          relatedEdgeIds = [];
        }

        try {
          signals = JSON.parse(f.signalsJson);
        } catch {
          signals = [];
        }

        return {
          id: f.id,
          caseId: f.caseId,
          source: f.source as FindingSource,
          type: f.type,
          severity: f.severity as FindingSeverity,
          confidence: f.confidence,
          title: f.title,
          description: f.description,
          relatedNodeIds,
          relatedEdgeIds,
          signals,
          createdAt: f.createdAt.toISOString(),
        };
      });

      return reply.send({
        findings: mappedFindings,
      });
    } catch (err) {
      app.log.error(err, "Failed to fetch risk findings");
      return reply.status(500).send({
        error: "Failed to fetch risk findings",
        statusCode: 500,
      });
    }
  });
}
