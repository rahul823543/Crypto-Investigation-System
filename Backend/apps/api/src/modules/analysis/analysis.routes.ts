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
      const fieldErrors = bodyResult.error.flatten().fieldErrors;
      const message = Object.entries(fieldErrors)
        .map(([field, errs]) => `${field}: ${errs?.join(", ")}`)
        .join("; ") || "Validation failed";
      return reply.status(400).send({
        error: "Invalid request payload",
        message,
        statusCode: 400,
      });
    }

    const { minConfidence, decayFactor, hardCeilingDepth } = bodyResult.data;

    const caseRecord = await app.prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseRecord) {
      return reply.status(404).send({
        error: "Case not found",
        statusCode: 404,
      });
    }

    if (
      caseRecord.status !== "graph_ready" &&
      caseRecord.status !== "analyzed" &&
      caseRecord.status !== "failed"
    ) {
      return reply.status(409).send({
        error: `Case must be in 'graph_ready', 'analyzed', or 'failed' state to analyze (current: ${caseRecord.status})`,
        statusCode: 409,
      });
    }

    // Update the visible lifecycle state before queueing so the frontend can
    // begin polling immediately. If BullMQ rejects the job, make that failure
    // visible instead of leaving the case in an ambiguous state.
    await app.prisma.case.update({
      where: { id: caseId },
      data: { status: "analyzing", errorMessage: null },
    });

    try {
      await app.analyzeQueue.add(
        "analyze-case",
        { caseId, minConfidence, decayFactor, hardCeilingDepth },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        },
      );
    } catch (err) {
      await app.prisma.case.update({
        where: { id: caseId },
        data: {
          status: "failed",
          errorMessage: "Failed to enqueue analysis job",
        },
      });
      throw err;
    }

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
      return reply.status(404).send({
        error: "Case not found",
        statusCode: 404,
      });
    }

    // A re-run can have a previous result. Prioritize the Case lifecycle over
    // that stale result so callers know the new run is still in progress.
    if (caseRecord.status === "failed") {
      return reply.status(200).send({
        status: "failed",
        analysis: null,
        error: caseRecord.errorMessage ?? "Analysis failed",
        message: caseRecord.errorMessage ?? "Analysis failed",
      });
    }

    if (caseRecord.status === "analyzing") {
      return reply.status(200).send({
        status: "analyzing",
        analysis: null,
        message: "Analysis is currently running",
      });
    }

    const [latestAnalysis, advancedFindings] = await Promise.all([
      app.prisma.analysisResult.findFirst({
        where: { caseId },
        orderBy: { createdAt: "desc" },
      }),
      app.prisma.riskFinding.findMany({
        where: { caseId, source: "python-intelligence" },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!latestAnalysis) {
      return reply.status(200).send({
        status: "pending",
        analysis: null,
        message: "Analysis has not been run yet",
      });
    }

    const analysis = {
      analysisId: latestAnalysis.id,
      caseId: latestAnalysis.caseId,
      analysisRequestId: latestAnalysis.analysisRequestId,
      riskScore: latestAnalysis.riskScore,
      riskLevel: latestAnalysis.riskLevel,
      findings: advancedFindings.map((finding) => ({
        id: finding.id,
        caseId: finding.caseId,
        source: "python-intelligence",
        type: finding.type,
        severity: finding.severity,
        confidence: finding.confidence,
        title: finding.title,
        description: finding.description,
        relatedNodeIds: JSON.parse(finding.relatedNodeIdsJson || "[]"),
        relatedEdgeIds: JSON.parse(finding.relatedEdgeIdsJson || "[]"),
        signals: JSON.parse(finding.signalsJson || "[]"),
        createdAt: finding.createdAt.toISOString(),
      })),
      suspiciousPaths: JSON.parse(latestAnalysis.suspiciousPathsJson || "[]"),
      circularFlows: JSON.parse(latestAnalysis.circularFlowsJson || "[]"),
      vaspAttribution: latestAnalysis.attributedVaspJson
        ? JSON.parse(latestAnalysis.attributedVaspJson)
        : null,
      metadata: JSON.parse(latestAnalysis.metadataJson || "{}"),
      createdAt: latestAnalysis.createdAt.toISOString(),
    };

    return reply.status(200).send({
      status: "complete",
      analysis,
      ...analysis,
    });
  });
};
