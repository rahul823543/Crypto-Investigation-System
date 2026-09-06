import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const triggerAnalysisSchema = z.object({
  minConfidence: z.number().min(0).max(1).optional().default(0.3),
  decayFactor: z.number().min(0).max(1).optional().default(0.85),
  hardCeilingDepth: z.number().int().positive().optional().default(10),
});

export const analysisRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /cases/:caseId/analyze
   * Enqueues an analysis job for the case.
   *
   * Body (all optional, defaults used if omitted):
   *   { minConfidence?: 0–1, decayFactor?: 0–1, hardCeilingDepth?: positive int }
   */
  app.post("/cases/:caseId/analyze", async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const bodyResult = triggerAnalysisSchema.safeParse(request.body ?? {});

    if (!bodyResult.success) {
      return reply.status(400).send({
        error: "Invalid request payload",
        details: bodyResult.error.flatten().fieldErrors,
      });
    }

    const { minConfidence, decayFactor, hardCeilingDepth } = bodyResult.data;

    const caseRecord = await app.prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseRecord) {
      return reply.status(404).send({ error: "Case not found" });
    }

    if (caseRecord.status !== "graph_ready" && caseRecord.status !== "analyzed") {
      return reply.status(409).send({
        error: `Case must be in 'graph_ready' or 'analyzed' state to analyze (current: ${caseRecord.status})`,
      });
    }

    await app.analyzeQueue.add(
      "analyze-case",
      { caseId, minConfidence, decayFactor, hardCeilingDepth },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      }
    );

    return reply.status(202).send({
      message: "Analysis job enqueued successfully",
      caseId,
      status: "analyzing",
    });
  });

  /**
   * GET /cases/:caseId/analysis
   * Retrieves the latest analysis result for the case.
   */
  app.get("/cases/:caseId/analysis", async (request, reply) => {
    const { caseId } = request.params as { caseId: string };

    const caseRecord = await app.prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseRecord) {
      return reply.status(404).send({ error: "Case not found" });
    }

    const latestAnalysis = await app.prisma.analysisResult.findFirst({
      where: { caseId },
      orderBy: { createdAt: "desc" },
    });

    if (!latestAnalysis) {
      return reply.status(404).send({
        error: "No analysis results found for this case",
      });
    }

    return reply.status(200).send({
      analysisId: latestAnalysis.id,
      caseId: latestAnalysis.caseId,
      analysisRequestId: latestAnalysis.analysisRequestId,
      riskScore: latestAnalysis.riskScore,
      riskLevel: latestAnalysis.riskLevel,
      suspiciousPaths: JSON.parse(latestAnalysis.suspiciousPathsJson || "[]"),
      circularFlows: JSON.parse(latestAnalysis.circularFlowsJson || "[]"),
      vaspAttribution: latestAnalysis.attributedVaspJson
        ? JSON.parse(latestAnalysis.attributedVaspJson)
        : null,
      metadata: JSON.parse(latestAnalysis.metadataJson || "{}"),
      createdAt: latestAnalysis.createdAt.toISOString(),
    });
  });
};
