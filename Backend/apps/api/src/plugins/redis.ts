import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import Redis from "ioredis";

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis;
  }
}

export default fp(async (app: FastifyInstance) => {
  const redis = new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null, 
  });

  redis.on("connect", () => {
    app.log.info("Redis connected");
  });

  redis.on("error", (err) => {
    app.log.error(err, "Redis connection error");
  });

  app.decorate("redis", redis);

  app.addHook("onClose", async (instance) => {
    await instance.redis.quit();
  });
});