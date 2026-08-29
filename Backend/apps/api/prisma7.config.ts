// apps/api/prisma.config.ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "src/db/prisma/schema.prisma",
  migrations: {
    path: "src/db/prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});