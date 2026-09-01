import { FastifyInstance } from "fastify";
import seededCase from "../../datasets/seeded-case.json" with { type: "json" };

export default async function demoRoutes(app: FastifyInstance) {
  app.get("/demo/seeded-case", async () => {
    return seededCase;
  });
}