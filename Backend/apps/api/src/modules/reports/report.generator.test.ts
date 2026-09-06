/**
 * Batch 1 offline smoke test:
 * Verifies the PDF generator produces a real buffer with a real SHA-256 hash
 * without needing a live database. Mocks PrismaClient with in-memory data.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { generateReportPdf } from "../../modules/reports/report.generator.js";
import { hashBuffer } from "../../modules/evidence/hash.service.js";

const fakePrisma = {
  case: {
    findUnique: async () => ({
      id: "case_batch1_test",
      rootAddress: "0x1234567890abcdef1234567890abcdef12345678",
      chainId: 1,
      mode: "live",
      status: "graph_ready",
      riskScore: 72,
      riskLevel: "high",
      errorMessage: null,
      createdAt: new Date("2026-08-21T10:00:00.000Z"),
      updatedAt: new Date("2026-08-21T10:30:00.000Z"),
      transactions: [
        {
          id: "tx_01",
          hash: "0xabc001",
          fromAddress: "0x1234567890abcdef1234567890abcdef12345678",
          toAddress: "0x2222222222222222222222222222222222222222",
          asset: "ETH",
          amount: "1.0",
          amountUsd: 2500,
          timestamp: new Date("2026-08-21T10:00:00.000Z"),
          transferType: "native",
        },
      ],
      graphNodes: [
        {
          id: "wallet:0x1234567890abcdef1234567890abcdef12345678",
          address: "0x1234567890abcdef1234567890abcdef12345678",
          type: "wallet",
          labelsJson: '["root"]',
          riskLevel: "high",
          totalInUsd: 0,
          totalOutUsd: 2500,
          isTraceableDeadEnd: false,
          outDegree: 1,
        },
        {
          id: "mixer:0x12d66f87a04a9e220c9d0f580b4acbe395e01a7f",
          address: "0x12d66f87a04a9e220c9d0f580b4acbe395e01a7f",
          type: "mixer",
          labelsJson: '["mixer","tornado cash eth 0.1"]',
          riskLevel: "high",
          totalInUsd: 2500,
          totalOutUsd: 0,
          isTraceableDeadEnd: true,
          outDegree: 0,
        },
      ],
      graphEdges: [
        {
          id: "edge:0xabc001:0",
          fromNodeId: "wallet:0x1234567890abcdef1234567890abcdef12345678",
          toNodeId: "mixer:0x12d66f87a04a9e220c9d0f580b4acbe395e01a7f",
          transactionHash: "0xabc001",
          asset: "ETH",
          amount: "1.0",
          amountUsd: 2500,
          timestamp: new Date("2026-08-21T10:00:00.000Z"),
          hopDepth: 1,
        },
      ],
      riskFindings: [
        {
          id: "finding_mixer_case_batch1_test_1",
          source: "basic-risk",
          type: "mixer_interaction",
          severity: "critical",
          confidence: 0.95,
          title: "Funds routed through known mixer",
          description:
            "Wallet deposited into a labeled mixing service. On-chain trail ends here.",
          signalsJson: '["known_mixer_address"]',
        },
      ],
    }),
  },
  analysisResult: {
    findFirst: async () => null,
  },
} as any;

test("Batch 1 — PDF generator produces a real Buffer and hashBuffer gives a 0x-prefixed SHA-256", async () => {
  const pdfBuffer = await generateReportPdf("case_batch1_test", fakePrisma);

  // 1. Buffer should be non-empty
  assert.ok(pdfBuffer instanceof Buffer, "generateReportPdf must return a Buffer");
  assert.ok(pdfBuffer.length > 1000, `PDF buffer too small: ${pdfBuffer.length} bytes`);

  // 2. PDF magic bytes (%PDF-)
  const header = pdfBuffer.slice(0, 5).toString("utf-8");
  assert.equal(header, "%PDF-", `PDF must start with %PDF-, got: ${header}`);

  // 3. hashBuffer output shape
  const hash = hashBuffer(pdfBuffer);
  assert.ok(hash.startsWith("0x"), "Hash must be 0x-prefixed");
  // SHA-256 hex = 64 chars + 2 for '0x' = 66
  assert.equal(hash.length, 66, `Hash should be 66 chars (0x + 64 hex), got: ${hash.length}`);

  // 4. Determinism: same buffer → same hash
  const hash2 = hashBuffer(pdfBuffer);
  assert.equal(hash, hash2, "hashBuffer must be deterministic");

  console.log(`  ✓ PDF size: ${pdfBuffer.length} bytes`);
  console.log(`  ✓ SHA-256: ${hash}`);
});

test("Batch 1 — hash.service hashBuffer produces correct known hash", () => {
  const input = Buffer.from("hello world", "utf-8");
  const hash = hashBuffer(input);
  // Actual SHA-256 of "hello world" as computed by Node crypto
  assert.equal(
    hash,
    "0xb94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
    "Known SHA-256 hash mismatch"
  );
});
