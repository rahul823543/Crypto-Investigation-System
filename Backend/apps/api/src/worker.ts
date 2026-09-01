import "dotenv/config";

import { loadEnv } from "./plugins/env.js";
import { createIngestWorker } from "./jobs/ingestCaseTransactions.job.js";

const env = loadEnv();

const { worker, shutdown } = createIngestWorker(
  env.REDIS_URL,
  env.ALCHEMY_API_URL,
  env.DATABASE_URL
);

console.log("Ingestion worker started, listening for jobs...");

const handleShutdown = async () => {
  await shutdown();
  process.exit(0);
};

process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);