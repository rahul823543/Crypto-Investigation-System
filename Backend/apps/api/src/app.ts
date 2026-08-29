import Fastify, {FastifyInstance} from 'fastify';
import { loadEnv } from "./plugins/env";

import type { Case } from "@sih/shared-types";
import type { CreateCaseResponse } from "@sih/shared-types";
import seededCase from "../datasets/seeded-case.json";

import prismaPlugin from "./plugins/prisma";
import redisPlugin from "./plugins/redis";
import queuesPlugin from "./plugins/queues";

export async function buildApp(): Promise<FastifyInstance> {
  const env = loadEnv();
  const app = Fastify({ logger: true });
  app.decorate("config", env);

  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(queuesPlugin);

  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.get<{ Reply: CreateCaseResponse }>("/demo/seeded-case", async () => {
  return seededCase as CreateCaseResponse;
})

  return app;
}