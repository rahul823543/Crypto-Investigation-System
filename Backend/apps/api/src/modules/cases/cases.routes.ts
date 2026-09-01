import type { FastifyInstance } from "fastify";

import { createCaseSchema } from "./cases.schema.js";
import {
  createCase,
  getCaseById,
  getCases,
  getCaseTransactions,
} from "./cases.service.js";

export async function casesRoutes(app: FastifyInstance) {
  /**
   * POST /cases
   * Create a new case and enqueue transaction ingestion.
   * Validates the request body against createCaseSchema before any DB write.
   */
  app.post("/cases", async (request, reply) => {
    const parsed = createCaseSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid request body",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const caseRecord = await createCase(app, parsed.data);
      return reply.status(201).send({ case: caseRecord });
    } catch (err) {
      app.log.error(err, "Failed to create case");
      return reply.status(500).send({ error: "Failed to create case" });
    }
  });

  /**
   * GET /cases/:caseId
   * Get a case by ID.
   */
  app.get<{ Params: { caseId: string } }>(
    "/cases/:caseId",
    async (request, reply) => {
      try {
        const { caseId } = request.params;

        const caseRecord = await getCaseById(app, caseId);

        if (!caseRecord) {
          return reply.code(404).send({
            message: "Case not found",
          });
        }

        return reply.send({
          case: caseRecord,
        });
      } catch (err) {
        app.log.error(err, "Failed to fetch case");
        return reply.status(500).send({ error: "Failed to fetch case" });
      }
    }
  );

  /**
   * GET /cases
   * List cases ordered by createdAt descending.
   * Query params: status (optional filter), limit (default 20, max 100), cursor (ISO date string for keyset pagination).
   */
  app.get<{
    Querystring: { status?: string; limit?: string; cursor?: string };
  }>("/cases", async (request, reply) => {
    try {
      const { status, limit: limitStr, cursor } = request.query;

      const limit = limitStr !== undefined ? parseInt(limitStr, 10) : undefined;
      if (limit !== undefined && (Number.isNaN(limit) || limit < 1)) {
        return reply.status(400).send({ error: "limit must be a positive integer" });
      }

      const result = await getCases(app, { status, limit, cursor });
      return reply.send(result);
    } catch (err) {
      app.log.error(err, "Failed to list cases");
      return reply.status(500).send({ error: "Failed to list cases" });
    }
  });

  /**
   * GET /cases/:caseId/transactions
   * Return all persisted NormalizedTransaction rows for a case.
   * Returns 404 if the case doesn't exist.
   * Returns an empty array if the case exists but has no transactions yet.
   */
  app.get<{ Params: { caseId: string } }>(
    "/cases/:caseId/transactions",
    async (request, reply) => {
      try {
        const { caseId } = request.params;

        const transactions = await getCaseTransactions(app, caseId);

        if (transactions === null) {
          return reply.code(404).send({ message: "Case not found" });
        }

        return reply.send({ transactions });
      } catch (err) {
        app.log.error(err, "Failed to fetch transactions");
        return reply.status(500).send({ error: "Failed to fetch transactions" });
      }
    }
  );
}