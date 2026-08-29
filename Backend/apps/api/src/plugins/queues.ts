import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { Queue } from "bullmq";

declare module "fastify" {
  interface FastifyInstance {
    testQueue: Queue;
  }
}

export default fp(async (app: FastifyInstance) => {
  const testQueue = new Queue("test-queue", {
    connection: app.redis,
  });

  app.decorate("testQueue", testQueue);

  app.addHook("onClose", async (instance) => {
    await instance.testQueue.close();
  });
});