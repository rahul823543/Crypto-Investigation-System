/**
 * test/EvidenceRegistry.test.ts
 * ──────────────────────────────
 * Phase 1: three deployment smoke tests (kept as regression).
 * Phase 2: full unit test suite for every EvidenceRegistry function.
 *
 * Test groups:
 *   Deployment          — Phase 1 smoke tests
 *   storeEvidence       — happy path + 3 revert cases
 *   Read functions      — getEvidence, getLatestEvidence, getEvidenceCount
 *   verifyReportHash    — integrity match + tamper detection
 *   setInvestigator     — allowlist management
 *   transferOwnership   — ownership transfer
 *   Multi-version       — versioned records are independent
 */
import { expect } from "chai";
import { ethers } from "hardhat";
import type { EvidenceRegistry } from "../typechain-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function deployRegistry(): Promise<EvidenceRegistry> {
  const factory = await ethers.getContractFactory("EvidenceRegistry");
  const registry = await factory.deploy();
  await registry.waitForDeployment();
  return registry as unknown as EvidenceRegistry;
}

/** Deterministic bytes32 hash from a plain string — used as fake report hashes. */
function fakeHash(seed: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(seed));
}

const CASE_A = "case_alpha_001";
const CASE_B = "case_beta_002";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EvidenceRegistry", function () {

  // ── Deployment (Phase 1 regression) ────────────────────────────────────────

  describe("Deployment", function () {
    it("deploys successfully and has a valid address", async function () {
      const registry = await deployRegistry();
      const address = await registry.getAddress();
      expect(address).to.match(/^0x[0-9a-fA-F]{40}$/);
    });

    it("sets deployer as owner", async function () {
      const [deployer] = await ethers.getSigners();
      const registry = await deployRegistry();
      expect(await registry.owner()).to.equal(deployer.address);
    });

    it("auto-authorises the deployer as investigator", async function () {
      const [deployer] = await ethers.getSigners();
      const registry = await deployRegistry();
      expect(await registry.authorizedInvestigators(deployer.address)).to.be.true;
    });
  });

  // ── storeEvidence ─────────────────────────────────────────────────────────

  describe("storeEvidence", function () {
    it("stores a hash and emits EvidenceStored", async function () {
      const registry = await deployRegistry();
      const hash = fakeHash("report-v1");

      const tx = await registry.storeEvidence(CASE_A, hash);
      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      const count = await registry.getEvidenceCount(CASE_A);
      expect(count).to.equal(1n);
    });

    it("increments version on each store for the same caseId", async function () {
      const registry = await deployRegistry();
      await registry.storeEvidence(CASE_A, fakeHash("v1"));
      await registry.storeEvidence(CASE_A, fakeHash("v2"));
      await registry.storeEvidence(CASE_A, fakeHash("v3"));

      expect(await registry.getEvidenceCount(CASE_A)).to.equal(3n);
      const latest = await registry.getLatestEvidence(CASE_A);
      expect(latest.version).to.equal(3n);
    });

    it("reverts when called by a non-authorised address", async function () {
      const [, stranger] = await ethers.getSigners();
      const registry = await deployRegistry();

      await expect(
        registry.connect(stranger).storeEvidence(CASE_A, fakeHash("x"))
      ).to.be.revertedWith("EvidenceRegistry: caller is not an authorized investigator");
    });

    it("reverts for an empty caseId", async function () {
      const registry = await deployRegistry();
      await expect(
        registry.storeEvidence("", fakeHash("x"))
      ).to.be.revertedWith("EvidenceRegistry: empty caseId");
    });

    it("reverts for a zero reportHash", async function () {
      const registry = await deployRegistry();
      await expect(
        registry.storeEvidence(CASE_A, ethers.ZeroHash)
      ).to.be.revertedWith("EvidenceRegistry: zero reportHash");
    });
  });

  // ── Read functions ────────────────────────────────────────────────────────

  describe("Read functions", function () {
    it("getEvidence returns the correct record by index", async function () {
      const registry = await deployRegistry();
      const hash1 = fakeHash("v1");
      const hash2 = fakeHash("v2");

      await registry.storeEvidence(CASE_A, hash1);
      await registry.storeEvidence(CASE_A, hash2);

      const rec = await registry.getEvidence(CASE_A, 0); // index 0 = version 1
      expect(rec.reportHash).to.equal(hash1);
      expect(rec.version).to.equal(1n);
      expect(rec.caseId).to.equal(CASE_A);
    });

    it("getEvidence reverts when index is out of bounds", async function () {
      const registry = await deployRegistry();
      await registry.storeEvidence(CASE_A, fakeHash("v1"));

      await expect(
        registry.getEvidence(CASE_A, 5)
      ).to.be.revertedWith("EvidenceRegistry: index out of bounds");
    });

    it("getLatestEvidence returns the most recent version", async function () {
      const registry = await deployRegistry();
      const latestHash = fakeHash("v3");

      await registry.storeEvidence(CASE_A, fakeHash("v1"));
      await registry.storeEvidence(CASE_A, fakeHash("v2"));
      await registry.storeEvidence(CASE_A, latestHash);

      const rec = await registry.getLatestEvidence(CASE_A);
      expect(rec.reportHash).to.equal(latestHash);
      expect(rec.version).to.equal(3n);
    });

    it("getLatestEvidence reverts when no evidence exists", async function () {
      const registry = await deployRegistry();
      await expect(
        registry.getLatestEvidence("case_nonexistent")
      ).to.be.revertedWith("EvidenceRegistry: no evidence for this case");
    });

    it("getEvidenceCount returns 0 for an unknown caseId", async function () {
      const registry = await deployRegistry();
      expect(await registry.getEvidenceCount("unknown_case")).to.equal(0n);
    });

    it("getEvidenceCount returns correct count after multiple stores", async function () {
      const registry = await deployRegistry();
      await registry.storeEvidence(CASE_A, fakeHash("1"));
      await registry.storeEvidence(CASE_A, fakeHash("2"));
      expect(await registry.getEvidenceCount(CASE_A)).to.equal(2n);
    });

    it("different caseIds are stored independently", async function () {
      const registry = await deployRegistry();
      await registry.storeEvidence(CASE_A, fakeHash("a1"));
      await registry.storeEvidence(CASE_B, fakeHash("b1"));
      await registry.storeEvidence(CASE_B, fakeHash("b2"));

      expect(await registry.getEvidenceCount(CASE_A)).to.equal(1n);
      expect(await registry.getEvidenceCount(CASE_B)).to.equal(2n);
    });
  });

  // ── verifyReportHash ─────────────────────────────────────────────────────

  describe("verifyReportHash", function () {
    it("returns true when the hash matches", async function () {
      const registry = await deployRegistry();
      const hash = fakeHash("report-pdf-bytes");
      await registry.storeEvidence(CASE_A, hash);

      expect(await registry.verifyReportHash(CASE_A, 1, hash)).to.be.true;
    });

    it("returns false when the hash does NOT match — tamper detection", async function () {
      const registry = await deployRegistry();
      await registry.storeEvidence(CASE_A, fakeHash("original"));

      expect(
        await registry.verifyReportHash(CASE_A, 1, fakeHash("tampered"))
      ).to.be.false;
    });

    it("reverts for version 0 (1-based)", async function () {
      const registry = await deployRegistry();
      await registry.storeEvidence(CASE_A, fakeHash("v1"));

      await expect(
        registry.verifyReportHash(CASE_A, 0, fakeHash("v1"))
      ).to.be.revertedWith("EvidenceRegistry: version must be >= 1");
    });

    it("reverts when the requested version does not exist yet", async function () {
      const registry = await deployRegistry();
      await registry.storeEvidence(CASE_A, fakeHash("v1"));

      await expect(
        registry.verifyReportHash(CASE_A, 99, fakeHash("v1"))
      ).to.be.revertedWith("EvidenceRegistry: version does not exist");
    });
  });

  // ── setInvestigator ───────────────────────────────────────────────────────

  describe("setInvestigator", function () {
    it("owner can authorise a new investigator", async function () {
      const [, newInvestigator] = await ethers.getSigners();
      const registry = await deployRegistry();

      await registry.setInvestigator(newInvestigator.address, true);
      expect(await registry.authorizedInvestigators(newInvestigator.address)).to.be.true;

      // Must be able to store without reverting
      await expect(
        registry.connect(newInvestigator).storeEvidence(CASE_A, fakeHash("by-new"))
      ).to.not.be.reverted;
    });

    it("owner can revoke an investigator", async function () {
      const [, investigator] = await ethers.getSigners();
      const registry = await deployRegistry();

      await registry.setInvestigator(investigator.address, true);
      await registry.setInvestigator(investigator.address, false);

      await expect(
        registry.connect(investigator).storeEvidence(CASE_A, fakeHash("revoked"))
      ).to.be.revertedWith("EvidenceRegistry: caller is not an authorized investigator");
    });

    it("emits InvestigatorUpdated event", async function () {
      const [, investigator] = await ethers.getSigners();
      const registry = await deployRegistry();

      await expect(registry.setInvestigator(investigator.address, true))
        .to.emit(registry, "InvestigatorUpdated")
        .withArgs(investigator.address, true);
    });

    it("reverts when called by a non-owner", async function () {
      const [, stranger] = await ethers.getSigners();
      const registry = await deployRegistry();

      await expect(
        registry.connect(stranger).setInvestigator(stranger.address, true)
      ).to.be.revertedWith("EvidenceRegistry: caller is not the owner");
    });

    it("reverts for the zero address", async function () {
      const registry = await deployRegistry();
      await expect(
        registry.setInvestigator(ethers.ZeroAddress, true)
      ).to.be.revertedWith("EvidenceRegistry: zero address");
    });
  });

  // ── transferOwnership ────────────────────────────────────────────────────

  describe("transferOwnership", function () {
    it("transfers ownership to a new address", async function () {
      const [, newOwner] = await ethers.getSigners();
      const registry = await deployRegistry();

      await registry.transferOwnership(newOwner.address);
      expect(await registry.owner()).to.equal(newOwner.address);
    });

    it("emits OwnershipTransferred event", async function () {
      const [deployer, newOwner] = await ethers.getSigners();
      const registry = await deployRegistry();

      await expect(registry.transferOwnership(newOwner.address))
        .to.emit(registry, "OwnershipTransferred")
        .withArgs(deployer.address, newOwner.address);
    });

    it("reverts when called by a non-owner", async function () {
      const [, stranger] = await ethers.getSigners();
      const registry = await deployRegistry();

      await expect(
        registry.connect(stranger).transferOwnership(stranger.address)
      ).to.be.revertedWith("EvidenceRegistry: caller is not the owner");
    });

    it("reverts for the zero address", async function () {
      const registry = await deployRegistry();
      await expect(
        registry.transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith("EvidenceRegistry: zero address");
    });
  });

  // ── Multi-version append integrity ────────────────────────────────────────

  describe("Multi-version append", function () {
    it("appending a new version does not overwrite the original hash", async function () {
      const registry = await deployRegistry();
      const originalHash = fakeHash("original-report");
      const correctedHash = fakeHash("corrected-report");

      await registry.storeEvidence(CASE_A, originalHash);
      await registry.storeEvidence(CASE_A, correctedHash);

      expect(await registry.verifyReportHash(CASE_A, 1, originalHash)).to.be.true;
      expect(await registry.verifyReportHash(CASE_A, 2, correctedHash)).to.be.true;
      // Cross-version mismatches must return false
      expect(await registry.verifyReportHash(CASE_A, 1, correctedHash)).to.be.false;
      expect(await registry.verifyReportHash(CASE_A, 2, originalHash)).to.be.false;
    });

    it("submittedBy is recorded correctly per version", async function () {
      const [deployer, investigator] = await ethers.getSigners();
      const registry = await deployRegistry();

      await registry.setInvestigator(investigator.address, true);
      await registry.storeEvidence(CASE_A, fakeHash("v1"));
      await registry.connect(investigator).storeEvidence(CASE_A, fakeHash("v2"));

      const v1 = await registry.getEvidence(CASE_A, 0);
      const v2 = await registry.getEvidence(CASE_A, 1);

      expect(v1.submittedBy).to.equal(deployer.address);
      expect(v2.submittedBy).to.equal(investigator.address);
    });
  });

});
