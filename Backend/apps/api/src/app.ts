import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { loadEnv } from "./plugins/env.js";
import prismaPlugin from "./plugins/prisma.js";
import redisPlugin from "./plugins/redis.js";
import queuesPlugin from "./plugins/queues.js";
import { casesRoutes } from "./modules/cases/cases.routes.js";
import { graphRoutes } from "./modules/graph/graph.routes.js";
import { riskRoutes } from "./modules/risk/risk.routes.js";
import healthRoutes from "./modules/health/health.routes.js";
import demoRoutes from "./demo/demo.routes.js";
import { reportsRoutes } from "./modules/reports/reports.routes.js";
import { analysisRoutes } from "./modules/analysis/analysis.routes.js";
import { attributionRoutes } from "./modules/attribution/attribution.routes.js";
import { evidenceRoutes } from "./modules/evidence/evidence.routes.js";

export async function buildApp(): Promise<FastifyInstance> {
  const env = loadEnv();
  const app = Fastify({
    logger: true,
  });
  app.decorate("config", env);

  await app.register(cors, {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  });

  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(queuesPlugin);
  await app.register(casesRoutes);
  await app.register(graphRoutes);
  await app.register(riskRoutes);
  await app.register(healthRoutes);
  await app.register(demoRoutes);
  await app.register(reportsRoutes);
  await app.register(analysisRoutes);
  await app.register(attributionRoutes);
  await app.register(evidenceRoutes);

  return app;
}