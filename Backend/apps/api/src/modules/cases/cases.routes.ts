import type { FastifyInstance } from "fastify";
import { z } from "zod";

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
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const message = Object.entries(fieldErrors)
        .map(([field, errs]) => `${field}: ${errs?.join(", ")}`)
        .join("; ") || "Validation failed";
      return reply.status(400).send({
        error: "Invalid request body",
        message,
        statusCode: 400,
      });
    }

    try {
      const caseRecord = await createCase(app, parsed.data);
      return reply.status(201).send({ case: caseRecord });
    } catch (err) {
      app.log.error(err, "Failed to create case");
      return reply.status(500).send({
        error: "Failed to create case",
        statusCode: 500,
      });
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
          return reply.status(404).send({
            error: "Case not found",
            statusCode: 404,
          });
        }

        return reply.send({
          case: caseRecord,
        });
      } catch (err) {
        app.log.error(err, "Failed to fetch case");
        return reply.status(500).send({
          error: "Failed to fetch case",
          statusCode: 500,
        });
      }
    }
  );

const listCasesQuerySchema = z.object({
  status: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val !== undefined ? parseInt(val, 10) : undefined))
    .refine((val) => val === undefined || (!Number.isNaN(val) && val > 0 && val <= 100), {
      message: "limit must be a positive integer between 1 and 100",
    }),
  cursor: z.string().optional(),
});

  /**
   * GET /cases
   * List cases ordered by createdAt descending.
   * Query params: status (optional filter), limit (default 20, max 100), cursor (ISO date string for keyset pagination).
   */
  app.get("/cases", async (request, reply) => {
    const queryResult = listCasesQuerySchema.safeParse(request.query);

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
      const { status, limit, cursor } = queryResult.data;
      const result = await getCases(app, { status, limit, cursor });
      return reply.send(result);
    } catch (err) {
      app.log.error(err, "Failed to list cases");
      return reply.status(500).send({
        error: "Failed to list cases",
        statusCode: 500,
      });
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
          return reply.status(404).send({
            error: "Case not found",
            statusCode: 404,
          });
        }

        return reply.send({ transactions });
      } catch (err) {
        app.log.error(err, "Failed to fetch transactions");
        return reply.status(500).send({
          error: "Failed to fetch transactions",
          statusCode: 500,
        });
      }
    }
  );
}