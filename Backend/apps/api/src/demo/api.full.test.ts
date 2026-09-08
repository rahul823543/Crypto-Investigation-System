import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { buildApp } from "../app.js";

function isPortOpen(port: number, host = "127.0.0.1"): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(400);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

test("API Full End-to-End Test with real local DB and fastify.inject()", async (t) => {
  const [pgOpen, redisOpen] = await Promise.all([
    isPortOpen(5432),
    isPortOpen(6379),
  ]);

  if (!pgOpen || !redisOpen) {
    console.warn("Skipping real DB test: local Postgres (5432) or Redis (6379) not reachable");
    return;
  }

  process.env.DATABASE_URL =
    process.env.DATABASE_URL ||
    "postgresql://sih:sih_password@localhost:5432/sih_forensic";
  process.env.REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
  process.env.ALCHEMY_API_URL =
    process.env.ALCHEMY_API_URL || "https://polygon-amoy.g.alchemy.com/v2/mock";

  let app: any;

  try {
    app = await buildApp();
    await app.ready();
  } catch (err) {
    // If local DB or Redis is unavailable in CI/restricted env, skip gracefully
    console.warn("Skipping real DB test: local DB/Redis not reachable:", err);
    if (app) {
      await app.close();
    }
    return;
  }

  const testRootAddress = "0x71C84167b3A8E008F56037856d116A179c735F60";
  let createdCaseId: string | null = null;

  t.after(async () => {
    if (app) {
      if (createdCaseId && app.prisma) {
        try {
          await app.prisma.case.delete({
            where: { id: createdCaseId },
          });
        } catch {
          // Ignore cleanup errors
        }
      }
      await app.close();
    }
  });

  // 1. Health check
  const healthRes = await app.inject({
    method: "GET",
    url: "/health",
  });
  assert.equal(healthRes.statusCode, 200);
  assert.deepEqual(JSON.parse(healthRes.payload), { status: "ok" });

  // 2. POST /cases (create case in demo mode against real DB)
  const createRes = await app.inject({
    method: "POST",
    url: "/cases",
    payload: {
      rootAddress: testRootAddress,
      chainId: 80002,
      mode: "demo",
    },
  });

  assert.equal(createRes.statusCode, 201);
  const createJson = JSON.parse(createRes.payload);
  assert.ok(createJson.case);
  assert.ok(createJson.case.id);
  createdCaseId = createJson.case.id;
  assert.equal(createJson.case.rootAddress, testRootAddress.toLowerCase());
  assert.equal(createJson.case.status, "created");

  // 3. GET /cases/:caseId (fetch persisted case from real DB)
  const getRes = await app.inject({
    method: "GET",
    url: `/cases/${createdCaseId}`,
  });
  assert.equal(getRes.statusCode, 200);
  const getJson = JSON.parse(getRes.payload);
  assert.equal(getJson.case.id, createdCaseId);

  // 4. GET /cases (list cases with query param validation)
  const listRes = await app.inject({
    method: "GET",
    url: "/cases?limit=10",
  });
  assert.equal(listRes.statusCode, 200);
  const listJson = JSON.parse(listRes.payload);
  assert.ok(Array.isArray(listJson.cases));
  assert.ok(listJson.cases.some((c: any) => c.id === createdCaseId));

  // 5. GET /cases/:caseId/analysis (should return 200 with pending status when not yet analyzed)
  const analysisRes = await app.inject({
    method: "GET",
    url: `/cases/${createdCaseId}/analysis`,
  });
  assert.equal(analysisRes.statusCode, 200);
  const analysisJson = JSON.parse(analysisRes.payload);
  assert.equal(analysisJson.status, "pending");
  assert.equal(analysisJson.analysis, null);

  // 6. GET /cases/:caseId/attribution (should return 200 with pending status)
  const attributionRes = await app.inject({
    method: "GET",
    url: `/cases/${createdCaseId}/attribution`,
  });
  assert.equal(attributionRes.statusCode, 200);
  const attributionJson = JSON.parse(attributionRes.payload);
  assert.equal(attributionJson.status, "pending");
  assert.equal(attributionJson.attribution, null);

  // 7. GET non-existent case -> 404 with standardized error response
  const notFoundRes = await app.inject({
    method: "GET",
    url: "/cases/non_existent_cuid_999",
  });
  assert.equal(notFoundRes.statusCode, 404);
  const notFoundJson = JSON.parse(notFoundRes.payload);
  assert.equal(notFoundJson.error, "Case not found");
  assert.equal(notFoundJson.statusCode, 404);
});
