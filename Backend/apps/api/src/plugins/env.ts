import { z } from "zod";

const envSchema = z.object({
  PORT: z
    .string()
    .default("3000")
    .transform((val) => Number(val))
    .refine((val) => !Number.isNaN(val) && val > 0, {
      message: "PORT must be a positive number",
    }),

  DATABASE_URL: z
    .string()
    .min(1, "DB url is req")
    .url("DB url must be valid connection string"),

  REDIS_URL: z
    .string()
    .min(1, "redis url is req")
    .url("redis url must be valid connection string"),

  ALCHEMY_API_URL: z
    .string()
    .url("ALCHEMY_API_URL must be a valid URL"),
});

export type Env = z.infer<typeof envSchema>;

declare module "fastify" {
  interface FastifyInstance {
    config: Env;
  }
}

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("invalid env variables");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  return parsed.data;
}