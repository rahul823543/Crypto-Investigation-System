import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { PrismaClient } from "../generated/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(async (app: FastifyInstance) => {
  const pool = new pg.Pool({
    connectionString: app.config.DATABASE_URL,
  });

  const adapter = new PrismaPg(pool);

  const prisma = new PrismaClient({
    adapter,
  });

  try {
    await prisma.$connect();
    app.log.info("Prisma connected to PostgreSQL");
  } catch (err) {
    app.log.error("Failed to connect to PostgreSQL");
    throw err;
  }

  app.decorate("prisma", prisma);

  app.addHook("onClose", async (instance) => {
    await instance.prisma.$disconnect();
    await pool.end();
  });
});
