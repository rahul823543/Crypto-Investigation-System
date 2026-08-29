import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { PrismaClient } from "../generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(async (app: FastifyInstance) => {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });

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
  });
});