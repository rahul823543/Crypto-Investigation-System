// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title EvidenceRegistry
 * @notice Stores tamper-evident SHA-256 report hashes for forensic investigation cases.
 *
 * Design decisions:
 * - Only cryptographic hashes are stored — never case data, wallet addresses,
 *   victim information, or officer notes. This keeps sensitive investigation
 *   data off public infrastructure.
 * - An investigator allowlist (managed by the contract owner) prevents
 *   unauthorised submissions for real case IDs.
 * - Evidence is versioned: corrected or expanded reports can be appended
 *   without overwriting the original hash record.
 * - The contract is intentionally minimal — it acts only as a timestamped
 *   integrity layer, not a case management system.
 *
 * Verification flow (off-chain):
 *   1. Recompute SHA-256 of the report PDF bytes.
 *   2. Call getEvidence(caseId, version - 1) or verifyReportHash(caseId, version, hash).
 *   3. Compare on-chain hash with computed hash — match proves integrity.
 */
contract EvidenceRegistry {
    // ─── Data Structures ────────────────────────────────────────────────────

    struct Evidence {
        string  caseId;
        uint256 version;
        bytes32 reportHash;   // SHA-256 hash of the finalised PDF report
        uint256 timestamp;    // block.timestamp at submission
        address submittedBy;  // authorised investigator who submitted
    }

    // ─── State ───────────────────────────────────────────────────────────────

    address public owner;

    /// @notice Tracks which addresses are authorised to submit evidence.
    mapping(address => bool) public authorizedInvestigators;

    /// @notice caseId → array of versioned evidence records (index 0 = version 1).
    mapping(string => Evidence[]) private evidenceVersions;

    // ─── Events ──────────────────────────────────────────────────────────────

    event EvidenceStored(
        string  indexed caseId,
        uint256         version,
        bytes32         reportHash,
        uint256         timestamp,
        address indexed submittedBy
    );

    event InvestigatorUpdated(
        address indexed investigator,
        bool            allowed
    );

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "EvidenceRegistry: caller is not the owner");
        _;
    }

    modifier onlyAuthorized() {
        require(
            authorizedInvestigators[msg.sender],
            "EvidenceRegistry: caller is not an authorized investigator"
        );
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
        authorizedInvestigators[msg.sender] = true;
        emit InvestigatorUpdated(msg.sender, true);
    }

    // ─── Admin Functions ─────────────────────────────────────────────────────

    /**
     * @notice Grant or revoke investigator authorisation.
     * @param investigator Address to update.
     * @param allowed      True to authorise, false to revoke.
     */
    function setInvestigator(address investigator, bool allowed) external onlyOwner {
        require(investigator != address(0), "EvidenceRegistry: zero address");
        authorizedInvestigators[investigator] = allowed;
        emit InvestigatorUpdated(investigator, allowed);
    }

    /**
     * @notice Transfer contract ownership. New owner is NOT auto-authorised as
     *         an investigator — call setInvestigator separately if needed.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "EvidenceRegistry: zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ─── Evidence Write ───────────────────────────────────────────────────────

    /**
     * @notice Store a new evidence hash for a case.
     *         Version is auto-incremented (starts at 1).
     * @param caseId     Opaque case identifier (e.g. "case_abc123").
     * @param reportHash SHA-256 hash of the finalised PDF report (bytes32).
     */
    function storeEvidence(
        string memory caseId,
        bytes32       reportHash
    ) external onlyAuthorized {
        require(bytes(caseId).length > 0,    "EvidenceRegistry: empty caseId");
        require(reportHash != bytes32(0),    "EvidenceRegistry: zero reportHash");

        uint256 version = evidenceVersions[caseId].length + 1;

        evidenceVersions[caseId].push(Evidence({
            caseId:      caseId,
            version:     version,
            reportHash:  reportHash,
            timestamp:   block.timestamp,
            submittedBy: msg.sender
        }));

        emit EvidenceStored(caseId, version, reportHash, block.timestamp, msg.sender);
    }

    // ─── Evidence Read ────────────────────────────────────────────────────────

    /**
     * @notice Returns the total number of evidence records for a case.
     */
    function getEvidenceCount(string memory caseId)
        external
        view
        returns (uint256)
    {
        return evidenceVersions[caseId].length;
    }

    /**
     * @notice Returns the evidence record at a specific array index (0-based).
     *         index 0 corresponds to version 1.
     */
    function getEvidence(string memory caseId, uint256 index)
        external
        view
        returns (Evidence memory)
    {
        require(
            index < evidenceVersions[caseId].length,
            "EvidenceRegistry: index out of bounds"
        );
        return evidenceVersions[caseId][index];
    }

    /**
     * @notice Returns the most recent evidence record for a case.
     */
    function getLatestEvidence(string memory caseId)
        external
        view
        returns (Evidence memory)
    {
        uint256 count = evidenceVersions[caseId].length;
        require(count > 0, "EvidenceRegistry: no evidence for this case");
        return evidenceVersions[caseId][count - 1];
    }

    /**
     * @notice Verify whether a given hash matches the stored hash for a
     *         specific case version. Used by the off-chain verification flow.
     * @param caseId     The case identifier.
     * @param version    1-based version number.
     * @param reportHash The hash to compare against.
     * @return           True if the hashes match, false otherwise.
     */
    function verifyReportHash(
        string  memory caseId,
        uint256        version,
        bytes32        reportHash
    ) external view returns (bool) {
        require(version > 0, "EvidenceRegistry: version must be >= 1");
        require(
            version <= evidenceVersions[caseId].length,
            "EvidenceRegistry: version does not exist"
        );
        return evidenceVersions[caseId][version - 1].reportHash == reportHash;
    }
}
