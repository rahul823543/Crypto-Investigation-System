import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { Queue } from "bullmq";

declare module "fastify" {
  interface FastifyInstance {
    ingestQueue: Queue;
    buildGraphQueue: Queue;
    analyzeQueue: Queue;
  }
}

export default fp(async (app: FastifyInstance) => {
  const ingestQueue = new Queue("ingest-case-transactions", {
    connection: app.redis,
  });

  const buildGraphQueue = new Queue("build-case-graph", {
    connection: app.redis,
  });

  const analyzeQueue = new Queue("analyze-case", {
    connection: app.redis,
  });

  app.decorate("ingestQueue", ingestQueue);
  app.decorate("buildGraphQueue", buildGraphQueue);
  app.decorate("analyzeQueue", analyzeQueue);

  app.addHook("onClose", async (instance) => {
    await Promise.all([
      instance.ingestQueue.close(),
      instance.buildGraphQueue.close(),
      instance.analyzeQueue.close(),
    ]);
  });
});