/**
 * scripts/storeEvidence.ts
 * ─────────────────────────
 * Phase 4 task: called by Role B (Fastify) to store a report hash on-chain
 * after PDF generation and SHA-256 hashing.
 *
 * Usage:
 *   npx hardhat run scripts/storeEvidence.ts --network amoy
 *
 * In production, Role B calls the contract directly via ethers.js in
 * apps/api/src/evidence/evidence.contract.ts using the ABI from artifacts/.
 */
import { ethers } from "hardhat";

async function main() {
  // TODO Phase 4 — implement evidence storage
  //
  // const CONTRACT_ADDRESS = process.env.EVIDENCE_CONTRACT_ADDRESS!;
  // const CASE_ID = process.env.CASE_ID!;
  // const REPORT_HASH_HEX = process.env.REPORT_HASH!; // hex string without 0x
  //
  // const registry = await ethers.getContractAt("EvidenceRegistry", CONTRACT_ADDRESS);
  // const reportHashBytes32 = ethers.hexlify(ethers.toBeArray("0x" + REPORT_HASH_HEX));
  //
  // const tx = await registry.storeEvidence(CASE_ID, reportHashBytes32);
  // await tx.wait();
  // console.log("Evidence stored. Transaction hash:", tx.hash);

  console.log("storeEvidence.ts — stub, populated in Phase 4");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
