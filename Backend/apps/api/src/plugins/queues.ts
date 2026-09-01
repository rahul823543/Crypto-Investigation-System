import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { Queue } from "bullmq";

declare module "fastify" {
  interface FastifyInstance {
    ingestQueue: Queue;
  }
}

export default fp(async (app: FastifyInstance) => {
  const ingestQueue = new Queue("ingest-case-transactions", {
    connection: app.redis,
  });

  app.decorate("ingestQueue", ingestQueue);

  app.addHook("onClose", async (instance) => {
    await instance.ingestQueue.close();
  });
});