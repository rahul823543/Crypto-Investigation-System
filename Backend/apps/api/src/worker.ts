import "dotenv/config";

import { loadEnv } from "./plugins/env.js";
import { createIngestWorker } from "./jobs/ingestCaseTransactions.job.js";
import { createBuildGraphWorker } from "./jobs/buildCaseGraph.job.js";

const env = loadEnv();

const { worker: ingestWorker, shutdown: shutdownIngest } = createIngestWorker(
  env.REDIS_URL,
  env.ALCHEMY_API_URL,
  env.DATABASE_URL
);

const { worker: buildGraphWorker, shutdown: shutdownBuildGraph } =
  createBuildGraphWorker(env.REDIS_URL, env.DATABASE_URL);

console.log(
  "Workers started, listening for jobs on 'ingest-case-transactions' and 'build-case-graph'..."
);

let isShuttingDown = false;

const handleShutdown = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("Shutting down workers gracefully...");
  await Promise.allSettled([shutdownIngest(), shutdownBuildGraph()]);
  process.exit(0);
};

process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);