import "dotenv/config";
import path from "node:path";
import fs from "node:fs/promises";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../apps/api/src/generated/client.js";
import { generateReportPdf } from "../apps/api/src/modules/reports/report.generator.js";
import { hashBuffer } from "../apps/api/src/modules/evidence/hash.service.js";
import { buildApp } from "../apps/api/src/app.js";

async function main() {
  console.log("=== Testing Report Generation Flow End-to-End ===");

  const databaseUrl =
    process.env.DATABASE_URL ||
    "postgresql://sih-project:bb9c4f726e3cbf55080679f70a450923db67cf9d1ab303ef323e66fe2dccf7f6@localhost:5432/sih_forensic";

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // 1. Create a test case in graph_ready status with sample nodes, edges, findings
  const caseRecord = await prisma.case.create({
    data: {
      rootAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      chainId: 137,
      mode: "live",
      status: "graph_ready",
      riskScore: 78,
      riskLevel: "high",
    },
  });
  console.log(`Created test case: ${caseRecord.id} (status: ${caseRecord.status})`);

  // Add sample transactions
  await prisma.transaction.createMany({
    data: [
      {
        caseId: caseRecord.id,
        hash: "0xabc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc1",
        chainId: 137,
        blockNumber: 45000000,
        fromAddress: caseRecord.rootAddress,
        toAddress: "0x1111111254fb6c44bac0bed2854e76f90643097d",
        asset: "USDT",
        amount: "5000000000",
        amountUsd: 5000,
        timestamp: new Date("2026-09-01T10:00:00Z"),
        transferType: "erc20",
        method: "swapExactTokensForTokens",
        rawProviderRef: "ref-1",
      },
      {
        caseId: caseRecord.id,
        hash: "0xabc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc2",
        chainId: 137,
        blockNumber: 45000010,
        fromAddress: "0x1111111254fb6c44bac0bed2854e76f90643097d",
        toAddress: "0x2222222222222222222222222222222222222222",
        asset: "USDT",
        amount: "4980000000",
        amountUsd: 4980,
        timestamp: new Date("2026-09-01T10:05:00Z"),
        transferType: "erc20",
        method: "transfer",
        rawProviderRef: "ref-2",
      },
    ],
  });

  // Add graph nodes
  const node1 = await prisma.graphNode.create({
    data: {
      caseId: caseRecord.id,
      address: caseRecord.rootAddress,
      type: "wallet",
      labelsJson: JSON.stringify(["target_root"]),
      riskLevel: "high",
      totalInUsd: 0,
      totalOutUsd: 5000,
    },
  });

  const node2 = await prisma.graphNode.create({
    data: {
      caseId: caseRecord.id,
      address: "0x1111111254fb6c44bac0bed2854e76f90643097d",
      type: "dex",
      labelsJson: JSON.stringify(["1inch_router"]),
      riskLevel: "low",
      totalInUsd: 5000,
      totalOutUsd: 4980,
    },
  });

  // Add graph edge
  await prisma.graphEdge.create({
    data: {
      caseId: caseRecord.id,
      fromNodeId: node1.id,
      toNodeId: node2.id,
      transactionHash: "0xabc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc1",
      asset: "USDT",
      amount: "5000000000",
      amountUsd: 5000,
      timestamp: new Date("2026-09-01T10:00:00Z"),
      hopDepth: 1,
      riskLevel: "medium",
    },
  });

  // Add basic risk finding
  await prisma.riskFinding.create({
    data: {
      caseId: caseRecord.id,
      source: "basic-risk",
      type: "high_volume_dex_swap",
      severity: "high",
      confidence: 0.92,
      title: "Rapid High-Volume DEX Swap Detected",
      description: "Wallet routed $5,000 USDT through 1inch DEX router immediately upon deposit.",
      relatedNodeIdsJson: JSON.stringify([node1.id, node2.id]),
      relatedEdgeIdsJson: JSON.stringify([]),
      signalsJson: JSON.stringify(["dex_interaction", "large_amount"]),
    },
  });

  console.log("Seeded test graph data, transactions, and basic risk findings.");

  // 2. Test via Fastify HTTP API endpoint POST /cases/:caseId/reports
  console.log("Testing POST /cases/:caseId/reports via Fastify app.inject()...");
  const app = await buildApp();
  await app.ready();

  const response = await app.inject({
    method: "POST",
    url: `/cases/${caseRecord.id}/reports`,
  });

  console.log(`HTTP Status: ${response.statusCode}`);
  const payload = JSON.parse(response.body);
  console.log("Response payload:", JSON.stringify(payload, null, 2));

  if (response.statusCode !== 201) {
    throw new Error(`Expected 201 Created but received ${response.statusCode}`);
  }

  // 3. Verify disk file exists and is a valid PDF
  const diskPath = path.resolve(process.cwd(), payload.report.filePath);
  const fileExists = await fs.stat(diskPath).then(() => true).catch(() => false);
  console.log(`PDF file exists on disk at ${diskPath}: ${fileExists}`);

  const fileBytes = await fs.readFile(diskPath);
  console.log(`PDF file size: ${fileBytes.length} bytes`);
  const isPdfHeader = fileBytes.subarray(0, 5).toString("utf-8") === "%PDF-";
  console.log(`PDF magic header verified: ${isPdfHeader}`);

  // 4. Verify SHA-256 hash matches disk bytes
  const computedHash = hashBuffer(fileBytes);
  console.log(`Computed file hash: ${computedHash}`);
  console.log(`Report DB hash:     ${payload.report.sha256Hash}`);
  const hashMatches = computedHash === payload.report.sha256Hash;
  console.log(`Hashes match: ${hashMatches}`);

  // 5. Test GET /cases/:caseId/reports
  const listResponse = await app.inject({
    method: "GET",
    url: `/cases/${caseRecord.id}/reports`,
  });
  console.log(`GET /cases/:caseId/reports status: ${listResponse.statusCode}`);
  const listPayload = JSON.parse(listResponse.body);
  console.log(`Reports in DB for case: ${listPayload.reports?.length}`);

  await app.close();
  await prisma.$disconnect();
  await pool.end();

  if (fileExists && isPdfHeader && hashMatches && listPayload.reports?.length >= 1) {
    console.log("\n>>> SUCCESS: All Steps 6 -> 5 -> 7 verified successfully! <<<");
  } else {
    throw new Error("Verification failed!");
  }
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
