import type { FastifyPluginAsync } from "fastify";

export const attributionRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /cases/:caseId/attribution
   * Returns the nearest-VASP attribution result for the case.
   *
   * Response shapes:
   *   { status: "pending", attribution: null }           — case exists but analysis not yet run
   *   { status: "complete", attribution: null }          — analysis ran, no VASP match found
   *   { status: "complete", attribution: VaspAttribution } — analysis ran, VASP match found
   */
  app.get("/cases/:caseId/attribution", async (request, reply) => {
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

    const latestAnalysis = await app.prisma.analysisResult.findFirst({
      where: { caseId },
      orderBy: { createdAt: "desc" },
    });

    // Analysis hasn't run yet — this is a normal expected state, not an error
    if (!latestAnalysis) {
      return reply.status(200).send({
        status: "pending",
        attribution: null,
        message: "Analysis has not been run yet for this case.",
      });
    }

    const attribution = latestAnalysis.attributedVaspJson
      ? JSON.parse(latestAnalysis.attributedVaspJson)
      : null;

    return reply.status(200).send({
      status: "complete",
      attribution,
      ...(attribution === null && {
        message: "No confident VASP match found",
      }),
    });
  });
};
