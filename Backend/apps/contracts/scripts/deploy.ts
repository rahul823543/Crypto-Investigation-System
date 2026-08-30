/**
 * scripts/deploy.ts
 * ─────────────────
 * Phase 4 task: deploy EvidenceRegistry to Polygon Amoy testnet.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network amoy
 *
 * After deployment, update apps/api/.env with:
 *   EVIDENCE_CONTRACT_ADDRESS=<deployed address>
 *   EVIDENCE_CHAIN_ID=80002
 */
import { ethers } from "hardhat";

async function main() {
  // TODO Phase 4 — implement deployment
  //
  // const [deployer] = await ethers.getSigners();
  // console.log("Deploying EvidenceRegistry with:", deployer.address);
  //
  // const factory = await ethers.getContractFactory("EvidenceRegistry");
  // const registry = await factory.deploy();
  // await registry.waitForDeployment();
  //
  // const address = await registry.getAddress();
  // console.log("EvidenceRegistry deployed to:", address);
  // console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);
  //
  // Hand off to Role B:
  // console.log("Add to api .env: EVIDENCE_CONTRACT_ADDRESS=" + address);

  console.log("deploy.ts — stub, populated in Phase 4");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
