/**
 * test/EvidenceRegistry.test.ts
 * ──────────────────────────────
 * Phase 1: minimal compilation smoke test.
 * Phase 2: full unit tests written here (Role E Phase 2 task).
 *
 * Phase 2 tests will cover (from BACKEND_PLAN §12 Phase 2):
 *   - storeEvidence: stores hash, increments version, emits event
 *   - storeEvidence: reverts for non-authorised caller
 *   - storeEvidence: reverts for empty caseId
 *   - storeEvidence: reverts for zero reportHash
 *   - getEvidence: returns correct record by index
 *   - getLatestEvidence: returns most recent version
 *   - getEvidenceCount: returns correct count
 *   - verifyReportHash: returns true for matching hash
 *   - verifyReportHash: returns false for mismatched hash (tamper scenario)
 *   - setInvestigator: owner can authorise new investigator
 *   - setInvestigator: reverts for non-owner caller
 *   - transferOwnership: transfers correctly
 *   - Multiple versions: appended correctly without overwriting previous
 */
import { expect } from "chai";
import { ethers } from "hardhat";

describe("EvidenceRegistry", function () {
  it("Phase 1 — contract deploys successfully", async function () {
    const factory = await ethers.getContractFactory("EvidenceRegistry");
    const registry = await factory.deploy();
    await registry.waitForDeployment();

    const address = await registry.getAddress();
    expect(address).to.be.a("string");
    expect(address).to.match(/^0x[0-9a-fA-F]{40}$/);
  });

  it("Phase 1 — deployer is set as owner", async function () {
    const [deployer] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("EvidenceRegistry");
    const registry = await factory.deploy();
    await registry.waitForDeployment();

    expect(await registry.owner()).to.equal(deployer.address);
  });

  it("Phase 1 — deployer is authorised investigator", async function () {
    const [deployer] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("EvidenceRegistry");
    const registry = await factory.deploy();
    await registry.waitForDeployment();

    expect(await registry.authorizedInvestigators(deployer.address)).to.be.true;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TODO Phase 2: add full unit tests here
  // ─────────────────────────────────────────────────────────────────────────
});
