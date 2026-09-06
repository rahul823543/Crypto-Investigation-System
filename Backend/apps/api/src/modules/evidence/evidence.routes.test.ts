import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { evidenceRoutes } from "./evidence.routes.js";
import {
  storeEvidenceOnChain,
  getEvidenceOnChain,
} from "../../clients/ethers.client.js";

test("ethers.client: storeEvidenceOnChain throws descriptive error when unconfigured", async () => {
  await assert.rejects(
    async () => {
      // Calling without env or config
      await storeEvidenceOnChain("case_123", "0x1234567890abcdef", {});
    },
    (err: Error) => {
      assert.ok(
        err.message.includes("Evidence integration not configured"),
        `Expected unconfigured message, got: ${err.message}`
      );
      return true;
    }
  );
});

test("evidence routes: POST /cases/:caseId/evidence returns 200 with 'storage_failed' when unconfigured", async () => {
  const createdRecords: any[] = [];

  const mockPrisma = {
    case: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        if (where.id === "case_test_001") {
          return { id: "case_test_001", rootAddress: "0x111", chainId: 1 };
        }
        return null;
      },
    },
    report: {
      findFirst: async ({
        where,
      }: {
        where: { id: string; caseId: string };
      }) => {
        if (where.id === "report_test_001" && where.caseId === "case_test_001") {
          return {
            id: "report_test_001",
            caseId: "case_test_001",
            sha256Hash:
              "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd",
            status: "generated",
            version: 1,
          };
        }
        return null;
      },
    },
    evidenceRecord: {
      count: async () => 0,
      create: async ({ data }: { data: any }) => {
        const record = { id: "evidence_rec_001", ...data };
        createdRecords.push(record);
        return record;
      },
      findMany: async () => createdRecords,
    },
  };

  const app = Fastify();
  app.decorate("prisma", mockPrisma as any);
  app.decorate("config", {
    PORT: 3000,
    DATABASE_URL: "postgresql://localhost/mock",
    REDIS_URL: "redis://localhost/mock",
    ALCHEMY_API_URL: "http://localhost:8545",
    INTELLIGENCE_API_URL: "http://localhost:8000",
    // Contract env vars left undefined intentionally
  } as any);

  await app.register(evidenceRoutes);
  await app.ready();

  // Test successful 200 response with storage_failed status
  const response = await app.inject({
    method: "POST",
    url: "/cases/case_test_001/evidence",
    payload: {
      reportId: "report_test_001",
    },
  });

  assert.equal(response.statusCode, 200);
  const json = JSON.parse(response.payload);
  assert.ok(json.evidenceRecord);
  assert.equal(json.evidenceRecord.caseId, "case_test_001");
  assert.equal(json.evidenceRecord.reportId, "report_test_001");
  assert.equal(json.evidenceRecord.verificationStatus, "storage_failed");
  assert.equal(
    json.evidenceRecord.reportHash,
    "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd"
  );
  assert.ok(
    json.evidenceRecord.caseKeyHash.startsWith("0x"),
    "caseKeyHash should be 0x-prefixed hash"
  );

  // Test GET route returns the created record
  const getResponse = await app.inject({
    method: "GET",
    url: "/cases/case_test_001/evidence",
  });

  assert.equal(getResponse.statusCode, 200);
  const getJson = JSON.parse(getResponse.payload);
  assert.equal(getJson.evidenceRecords.length, 1);
  assert.equal(getJson.evidenceRecords[0].verificationStatus, "storage_failed");

  await app.close();
});

test("ethers.client: getEvidenceOnChain throws descriptive error when unconfigured", async () => {
  await assert.rejects(
    async () => {
      await getEvidenceOnChain("case_123", {});
    },
    (err: Error) => {
      assert.ok(
        err.message.includes("Evidence integration not configured"),
        `Expected unconfigured message, got: ${err.message}`
      );
      return true;
    }
  );
});

test("evidence routes: POST /cases/:caseId/evidence returns 404 if case or report not found", async () => {
  const mockPrisma = {
    case: {
      findUnique: async () => null,
    },
    report: {
      findFirst: async () => null,
    },
    evidenceRecord: {
      count: async () => 0,
      create: async () => ({}),
      findMany: async () => [],
    },
  };

  const app = Fastify();
  app.decorate("prisma", mockPrisma as any);
  app.decorate("config", {} as any);

  await app.register(evidenceRoutes);
  await app.ready();

  const response = await app.inject({
    method: "POST",
    url: "/cases/non_existent_case/evidence",
    payload: {
      reportId: "report_001",
    },
  });

  assert.equal(response.statusCode, 404);
  const json = JSON.parse(response.payload);
  assert.equal(json.error, "Case not found");
  assert.equal(json.statusCode, 404);
  await app.close();
});

test("evidence routes: POST /evidence/verify returns verified: false with clear reason when storage_failed", async () => {
  const mockPrisma = {
    case: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        if (where.id === "case_test_001") {
          return { id: "case_test_001" };
        }
        return null;
      },
    },
    report: {
      findFirst: async ({ where }: { where: { id: string; caseId: string } }) => {
        if (where.id === "report_test_001" && where.caseId === "case_test_001") {
          return {
            id: "report_test_001",
            caseId: "case_test_001",
            sha256Hash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
            status: "generated",
            version: 1,
          };
        }
        return null;
      },
    },
    evidenceRecord: {
      findFirst: async () => ({
        id: "ev_01",
        caseId: "case_test_001",
        reportId: "report_test_001",
        verificationStatus: "storage_failed",
        reportHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        contractAddress: null,
        transactionHash: null,
        chainId: null,
        version: 1,
        storedAt: new Date("2026-09-07T00:00:00.000Z"),
      }),
    },
  };

  const app = Fastify();
  app.decorate("prisma", mockPrisma as any);
  app.decorate("config", {} as any);

  await app.register(evidenceRoutes);
  await app.ready();

  const response = await app.inject({
    method: "POST",
    url: "/evidence/verify",
    payload: {
      caseId: "case_test_001",
      reportId: "report_test_001",
    },
  });

  assert.equal(response.statusCode, 200);
  const json = JSON.parse(response.payload);
  assert.equal(json.caseId, "case_test_001");
  assert.equal(json.reportId, "report_test_001");
  assert.equal(json.verified, false);
  assert.equal(json.reason, "no evidence stored on-chain for this report");
  assert.equal(json.computedHash, "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890");
  assert.equal(json.onChainHash, null);

  await app.close();
});

test("evidence routes: POST /evidence/verify returns 404 for non-existent case", async () => {
  const mockPrisma = {
    case: {
      findUnique: async () => null,
    },
    report: {
      findFirst: async () => null,
    },
    evidenceRecord: {
      findFirst: async () => null,
    },
  };

  const app = Fastify();
  app.decorate("prisma", mockPrisma as any);
  app.decorate("config", {} as any);

  await app.register(evidenceRoutes);
  await app.ready();

  const response = await app.inject({
    method: "POST",
    url: "/evidence/verify",
    payload: {
      caseId: "non_existent_case",
      reportId: "report_test_001",
    },
  });

  assert.equal(response.statusCode, 404);
  const json = JSON.parse(response.payload);
  assert.equal(json.error, "Case not found");
  assert.equal(json.statusCode, 404);

  await app.close();
});

