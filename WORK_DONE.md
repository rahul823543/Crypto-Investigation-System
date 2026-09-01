# Work Done — On-Chain Forensic Triage Engine
## Phase 1 Complete | Roles: C, D, E

---

## Quick Context

This project is a hackathon prototype that helps law enforcement trace suspicious crypto transactions.
You are solo-handling three roles (C, D, E) while your partner handles the main Node.js backend (Role B).

How the overall system works:

  Investigator enters a wallet address
           ↓
  Node.js backend fetches transactions and builds a graph
           ↓
  Python service (your work) analyses the graph for suspicious patterns
           ↓
  A PDF report is generated and its hash is stored on-chain (blockchain)
           ↓
  Anyone can verify the report has not been tampered with

Phase 1 goal: get all the foundations in place so every role can work independently.

---

## ROLE D — Python Intelligence Service
Location: apps/intelligence/

This is a Python web service that receives a transaction graph from the Node.js backend,
runs analysis on it, and sends back a risk score with suspicious paths flagged.

### What was built:

PROJECT STRUCTURE
  Set up a complete Python project using Poetry (the dependency/package manager).
  Organised into folders: api, schemas, graph, traversal, detection, scoring, ranking.
  Each folder beyond api and schemas is a stub — ready to be filled in Phases 2-4.

CONFIGURATION
  config.py       reads settings (port, version) from a .env file
  .env.example    template file — copy to .env before running

DATA SCHEMAS (app/schemas/)
  These are strict definitions of what data the service accepts and sends back.

  Request schema (request.py) — what the Node.js backend must send:
    - Case ID
    - Root wallet address (must be a valid Ethereum address: 0x + 40 hex chars)
    - Max hops to trace (between 1 and 3)
    - List of graph nodes (wallets, DEX routers, bridges, etc.)
    - List of graph edges (the fund transfers between those nodes)
    - Raw transactions and any basic risk findings already detected
    - Built-in safety check: every edge must connect two nodes that exist in the graph

  Response schema (response.py) — what the service sends back:
    - riskScore (0-100) and riskLevel (low / medium / high / critical)
    - suspiciousPaths: ranked list of flagged fund routes
    - circularFlows: loops where money returns to an earlier wallet
    - findings: human-readable explanations of what was flagged
    - analysisMetadata: engine version + how long analysis took

API ENDPOINTS (app/api/routes.py)
  GET  /health         confirms the service is alive, returns engine version
  POST /v1/analyze     the main analysis endpoint
                       (currently returns a dummy response to unblock Role B
                        while real algorithms are built in Phases 2-4)

TESTS (tests/)
  49 tests written — all 49 passing in 0.20 seconds
  What is tested:
    - Valid request   → 200 OK with correct response structure
    - Invalid address → 422 error
    - Edge with unknown node → 422 error
    - Missing fields  → 422 error
    - Same input always gives same output (determinism)

How to start the service:
  cd apps/intelligence
  cp .env.example .env
  poetry install
  poetry run uvicorn app.main:app --port 8001 --reload

---

## ROLE C — Seeded Data and Shared Types
Location: Backend/apps/api/datasets/  and  Backend/packages/shared-types/

Role C provides realistic test data and the TypeScript type definitions used across the system.

### What was built:

ADDRESS LABEL DATASET (datasets/address-labels.json)
  A curated list of 23 known blockchain addresses used to auto-classify wallets.

  Category             Count   Examples
  ─────────────────────────────────────────────────────────────
  DEX Routers            6     QuickSwap V2/V3, Uniswap V3, SushiSwap, 1inch
  Bridge Contracts       5     Polygon PoS Bridge, Hop Protocol, xDai Bridge
  Tornado Cash Mixers    5     ETH 0.1, 1, 10, 100, DAI 100 pools
  OFAC Sanctioned        5     Lazarus Group addresses from OFAC SDN list
  Flagged / Risky        2     Known launderers

  Each entry has: address, type, label, chainId (null = applies across all chains)

SEEDED DEMO CASE (datasets/seeded-case.json)
  A complete fake investigation scenario used for:
    1. Demo when live blockchain APIs are unavailable
    2. Development and testing without real data

  The scenario:
    A suspect wallet fans out USDC to 3 wallets very quickly,
    and also routes funds through a DEX router — classic laundering patterns.

  What is inside the file:

    case
      The investigation case: ID, root address, status = "analyzed"

    transactions (5 entries)
      tx1: Root → Wallet A  (3,000 USDC, 10:00)
      tx2: Root → Wallet B  (3,000 USDC, 10:03)
      tx3: Root → Wallet C  (4,000 USDC, 10:05)
      tx4: Root → QuickSwap (5,000 USDC, 10:07)  ← DEX swap to hide trail
      tx5: Wallet A → Wallet D (2,800 USDC, 10:25) ← second hop

    graph
      nodes: 6  (root, 3 recipients, 1 DEX router, 1 final wallet)
      edges: 5  (one per transaction, with stable IDs)

    basicFindings (2 findings)
      fan_out:         "Sent to 4 addresses in 7 minutes"  severity: HIGH
      dex_interaction: "Routed through QuickSwap"           severity: MEDIUM

    analysisResult (pre-baked Python response for the demo fallback)
      riskScore: 78 / riskLevel: "high"
      suspiciousPaths: 2 flagged routes
      circularFlows: none

  VALIDATION: tested against Python schemas — all 3 checks passed:
    [PASS] AnalysisRequest: 6 nodes, 5 edges, 5 transactions, 2 findings
    [PASS] AnalysisResponse: score=78, level=high, 2 paths
    [PASS] All cross-references valid

SHARED TYPESCRIPT TYPES (packages/shared-types/src/)
  Were empty stubs — now fully populated.

  graph.ts        GraphNode, GraphEdge, GraphResponse, RiskFinding, AddressLabel
  transaction.ts  NormalizedTransaction, AnalysisRequest, AnalysisResponse,
                  SuspiciousPath, CircularFlow
  index.ts        Re-exports everything so the backend can use:
                  import { GraphNode } from "@sih/shared-types"

---

## ROLE E — Smart Contract (Hardhat)
Location: Backend/apps/contracts/

After a PDF investigation report is generated, its SHA-256 hash is stored on a blockchain.
Anyone can re-hash the PDF later and compare — matching hashes proves the report was not altered.

The contract only stores HASHES — never wallet addresses, case details, or officer notes.

### What was built:

EvidenceRegistry.sol — THE SMART CONTRACT

  What it does:
    - Stores report hashes on-chain, tied to a case ID
    - Supports multiple versions (corrected reports can be appended, original not erased)
    - Only authorised investigators can submit hashes (allowlist controlled by owner)

  Key functions:
    storeEvidence(caseId, reportHash)       Authorised investigators only — stores hash, auto-increments version
    getEvidence(caseId, index)              Anyone — reads a specific version
    getLatestEvidence(caseId)               Anyone — gets the most recent version
    verifyReportHash(caseId, version, hash) Anyone — returns true/false (the integrity check)
    setInvestigator(address, bool)          Owner only — grant or revoke access
    transferOwnership(newOwner)             Owner only — hand off contract control

HARDHAT PROJECT SETUP
  hardhat.config.ts   Polygon Amoy testnet (chainId 80002) + Polygonscan verification
  tsconfig.json       TypeScript settings
  .env.example        Template: PRIVATE_KEY, POLYGON_AMOY_RPC_URL, POLYGONSCAN_API_KEY
  package.json        All Hardhat dependencies listed

SCRIPT STUBS (to be completed in Phase 4)
  scripts/deploy.ts           will deploy the contract to Polygon Amoy
  scripts/storeEvidence.ts    will submit a report hash after PDF generation
  scripts/verifyEvidence.ts   will run the MATCH / MISMATCH verification flow

TEST FILE
  test/EvidenceRegistry.test.ts
    3 smoke tests for Phase 1 (deploys OK, sets owner, authorises owner)
    Detailed outline of all Phase 2 tests as TODO comments

COMPILATION RESULT
  Compiled 1 Solidity file successfully (evm target: paris)
  Generated 6 TypeScript typings (TypeChain)
  Node.js backend can now import EvidenceRegistry type from typechain-types/

---

## File Tree — Everything Created

  SIH2026/
  │
  ├── apps/
  │   └── intelligence/                    ← Role D: Python service
  │       ├── pyproject.toml               ← Poetry config + dependencies
  │       ├── .env.example                 ← Env var template
  │       ├── README.md
  │       ├── app/
  │       │   ├── main.py                  ← FastAPI app factory
  │       │   ├── config.py                ← Settings from .env
  │       │   ├── api/routes.py            ← GET /health + POST /v1/analyze (mock)
  │       │   ├── schemas/
  │       │   │   ├── request.py           ← AnalysisRequest (with validators)
  │       │   │   └── response.py          ← AnalysisResponse
  │       │   ├── graph/builder.py         ← Phase 2 stub
  │       │   ├── traversal/multi_hop.py   ← Phase 4 stub
  │       │   ├── detection/
  │       │   │   ├── circular_flows.py    ← Phase 4 stub
  │       │   │   └── suspicious_paths.py  ← Phase 4 stub
  │       │   ├── scoring/risk_score.py    ← Phase 4 stub
  │       │   └── ranking/path_ranker.py   ← Phase 4 stub
  │       └── tests/
  │           ├── conftest.py              ← Fixtures + ASGI test client
  │           ├── test_api.py              ← 31 HTTP endpoint tests
  │           └── test_schemas.py          ← 18 schema unit tests
  │
  └── Backend/
      ├── apps/
      │   ├── api/datasets/
      │   │   ├── address-labels.json      ← Role C: 23 labelled addresses
      │   │   └── seeded-case.json         ← Role C: full demo scenario
      │   └── contracts/                   ← Role E: Hardhat project
      │       ├── package.json
      │       ├── hardhat.config.ts        ← Polygon Amoy configured
      │       ├── tsconfig.json
      │       ├── .env.example
      │       ├── contracts/
      │       │   └── EvidenceRegistry.sol ← The smart contract
      │       ├── scripts/
      │       │   ├── deploy.ts            ← Phase 4 stub
      │       │   ├── storeEvidence.ts     ← Phase 4 stub
      │       │   └── verifyEvidence.ts    ← Phase 4 stub
      │       └── test/
      │           └── EvidenceRegistry.test.ts ← Smoke tests + Phase 2 outline
      └── packages/shared-types/src/
          ├── case.ts                      ← Role B's (unchanged)
          ├── graph.ts                     ← Role C: GraphNode, RiskFinding...
          ├── transaction.ts               ← Role C: NormalizedTransaction, AnalysisRequest...
          └── index.ts                     ← Exports all three modules

---

## Phase 1 Definition of Done

  Checkpoint                                  Who      Status
  ──────────────────────────────────────────────────────────
  Fastify API starts locally                  Role B   Done (partner)
  PostgreSQL connection works                 Role B   Done (partner)
  Redis + BullMQ working                      Role B   Done (partner)
  Python service starts and returns mock      Role D   DONE
  Seeded dataset exists                       Role C   DONE
  Contract compiles                           Role E   DONE
  Shared DTOs frozen for MVP                  C+D+E    DONE

  PHASE 1: 100% COMPLETE

---

## What Comes Next (Phases 2-5)

  Phase 2   Parse the seeded transaction fixture in Python; Role E writes contract unit tests
  Phase 3   Build the real NetworkX graph from nodes/edges; align Python parser with graph output
  Phase 4   Real algorithms: multi-hop traversal, circular flow detection, risk scoring;
            deploy contract to Polygon Amoy testnet
  Phase 5   All pytest scenario fixtures; latency tests; final README

  Note: The Phase 1 mock in app/api/routes.py has clear MOCK RESPONSE comments showing
  exactly where the real algorithm calls slot in — it is a clean swap-in, no restructuring needed.
