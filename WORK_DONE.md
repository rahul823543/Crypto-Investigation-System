# Project Overview, Context & Work Completed
## On-Chain Forensic Triage Engine (SIH26182)
*Current Status: Phase 3 Completed & Merged, Phase 4 (v3 Alignment & Intelligence Upgrades) in Progress*

---

## 1. Executive Summary & Purpose

The **On-Chain Forensic Triage Engine** is a specialized investigative platform developed for crypto crime triage, financial intelligence units, and law enforcement (addressing Problem Statement **SIH26182**).

### The Problem
When illicit funds are moved across EVM blockchains (Ethereum, Polygon, etc.), perpetrators frequently obscure money trails using multi-hop hops, rapid relays, decentralized exchange (DEX) liquidity pools, peeling chains, and mixer smart contracts. Manual transaction analysis is slow and error-prone. Furthermore, forensic evidence gathered during investigations must maintain an unbroken chain of custody and be tamper-evident for court presentation.

### The System Solution
1. **Target Ingestion**: An investigator inputs a suspect EVM wallet address and case parameters.
2. **Transaction Ingestion & Graph Construction**: The backend ingests on-chain transfers (native currency + ERC-20 tokens) and builds an in-memory directed multigraph (`MultiDiGraph`) with classified entity nodes and transaction edges.
3. **Automated Intelligence & Risk Scoring**: A dedicated Python intelligence service analyzes the transaction graph using graph traversal, heuristic pattern detection (mixers, fan-outs, rapid movements, bridges, DEX swaps), circular flow detection, and composite risk scoring.
4. **VASP Attribution**: The system automatically locates the nearest Virtual Asset Service Provider (centralized exchange, regulated off-ramp) along the fund trail, recording the hop distance and confidence to enable subpoena requests.
5. **Forensic Reporting & Blockchain Anchoring**: An unalterable PDF case report is generated. Its SHA-256 cryptographic hash is anchored on an EVM smart contract (`EvidenceRegistry.sol` deployed on Polygon Amoy testnet). Any party can independently verify that the report has not been altered or tampered with.
6. **Investigator Dashboard**: A reactive web interface provides case management, visual graph exploration, flagged findings triage, and evidence verification.

---

## 2. Architecture & Team Structure (v3 Model)

Under `BACKEND_PLAN_v3.md`, the backend development is divided between a two-person team structure:

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                  REACT FRONTEND (Vite / TS)                              │
│   Case Management │ Graph Visualization │ Findings Triage │ Report / Proof Verification  │
└────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                         │ HTTP / JSON
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                            DEV 1 — ROLE B: FASTIFY API & ORCHESTRATION                   │
│  • Fastify REST API with Zod validation                                                  │
│  • PostgreSQL + Prisma ORM (Cases, Wallets, Transactions, Findings, Evidence)            │
│  • BullMQ + Redis job queues (Async ingestion, analysis dispatch, PDF generation)        │
│  • Blockchain data provider & transaction normalization                                  │
│  • PDF report generation & SHA-256 evidence hashing                                      │
│  • Ethers.js integration with deployed EvidenceRegistry contract                         │
└───────────────────┬───────────────────────────────────────────────────┬──────────────────┘
                    │ REST: POST /v1/analyze                            │ Calls via ethers.js
                    ▼                                                   ▼
┌───────────────────────────────────────────────┐     ┌────────────────────────────────────┐
│      DEV 2 — ROLE D: PYTHON INTELLIGENCE      │     │  DEV 2 — ROLE E: EVIDENCE REGISTRY │
│  • FastAPI service (uvicorn)                  │     │  • Solidity contract (Polygon)     │
│  • NetworkX MultiDiGraph reconstruction       │     │  • Role-based access control       │
│  • Confidence-decay traversal                 │     │  • Versioned SHA-256 hash storage  │
│  • Suspicion-first priority queue search      │     │  • On-chain hash verification      │
│  • Cycle / Circular-flow detection            │     └────────────────────────────────────┘
│  • Heuristic detectors & composite risk score │
│  • Nearest VASP attribution                   │
└───────────────────▲───────────────────────────┘
                    │
                    │ Consumes labels, DTOs & graph definitions
┌───────────────────┴───────────────────────────┐
│        DEV 2 — ROLE C: GRAPH & BASIC RISK     │
│  • Shared DTOs (@sih/shared-types)            │
│  • 23-Address label dataset (DEX/Bridge/Mixer)│
│  • Seeded demo case fixture                   │
│  • Basic rule-based risk detectors            │
└───────────────────────────────────────────────┘
```

### Team Responsibilities:
- **Dev 1 (Role B)**: Owns the Node.js / Fastify backend, database, queue orchestration, blockchain ingestion, reporting, and frontend-facing REST endpoints.
- **Dev 2 (Roles C + D + E)**: Owns the core forensic intelligence pipeline:
  - **Role C**: Shared schemas/types, curated entity labels, seeded case fixtures, basic risk findings.
  - **Role D**: Python intelligence service, graph traversal, cycle detection, path ranking, risk scoring, and VASP attribution.
  - **Role E**: Solidity smart contract (`EvidenceRegistry.sol`), Hardhat tests, and testnet deployment scripts. Front-loaded into early phases to keep Phase 4 focused on algorithms.

---

## 3. Chronological Progression of Work Done

### Phase 1: Foundations & Independent Contracts (Completed)
*Objective: Establish project structure, configuration, strict contracts, and mocks so all components can build and test independently.*

1. **Role B (Node.js API Foundation)**:
   - Initialized Fastify application with TypeScript and structured routing.
   - Configured Prisma with PostgreSQL schema for `Case`, `Transaction`, `GraphNode`, `GraphEdge`, and `Report`.
   - Setup Redis and BullMQ for asynchronous queue infrastructure.
   - Built Docker Compose environment for local PostgreSQL and Redis services.
   - Implemented `GET /health` and seeded fallback routes `GET /demo/seeded-case`.

2. **Role D (Python Intelligence Service Foundation)**:
   - Structured `apps/intelligence` with Poetry dependency management.
   - Built FastAPI app factory with configuration loading from `.env`.
   - Implemented strict Pydantic schemas in `schemas/request.py` and `schemas/response.py` with custom EVM address validators (`0x` + 40 hex characters) and referential edge integrity guards.
   - Created `GET /health` and initial `POST /v1/analyze` endpoint.
   - Created 49 initial unit tests in pytest.

3. **Role C (Seeded Data & Shared Types)**:
   - Curated `address-labels.json` containing 23 high-profile verified addresses:
     - DEX Routers: QuickSwap, Uniswap V3, SushiSwap, 1inch.
     - Bridge Contracts: Polygon PoS Bridge, Hop Protocol, xDai Bridge.
     - Mixers: Tornado Cash pools (0.1, 1, 10, 100 ETH, 100 DAI).
     - OFAC Sanctioned: Lazarus Group sanctioned addresses.
   - Created `seeded-case.json`: realistic 5-transaction demo scenario exhibiting rapid fund fan-out and DEX routing.
   - Created `@sih/shared-types` monorepo package exporting synchronized TypeScript definitions (`GraphNode`, `GraphEdge`, `NormalizedTransaction`, `AnalysisRequest`, `AnalysisResponse`, etc.).

4. **Role E (Smart Contract Foundation)**:
   - Initialized Hardhat project in `Backend/apps/contracts`.
   - Authored `EvidenceRegistry.sol`:
     - Secure case-indexed array of SHA-256 evidence hashes.
     - Auto-incrementing version history allowing case amendments while preserving original audit trails.
     - Granular investigator authorization allowlist controlled by the contract owner.
     - Read functions `getEvidence`, `getLatestEvidence`, and `verifyReportHash`.
   - Configured Polygon Amoy testnet (`chainId: 80002`).
   - Verified compilation with TypeChain generating TypeScript contract bindings.

---

### Phase 2: Ingestion Pipelines & Contract Verification (Completed)
*Objective: Wire data pipelines, build graph parsing structures, and prove contract functionality.*

1. **Role B (Data Pipeline)**:
   - Implemented case creation endpoints and transaction ingestion workers.
   - Built transaction normalization transforming raw EVM transfer logs into unified transaction DTOs.
   - Established transaction query layer with filtering and pagination.

2. **Role C & D (Graph Reconstruction Engine)**:
   - Relocated intelligence service to `Backend/apps/intelligence`.
   - Built NetworkX graph builder (`graph/builder.py`) transforming `AnalysisRequest` nodes and edges into an in-memory graph.
   - Preserved node attributes (wallet type, labels, risk level, in/out USD volume) and edge attributes (transaction hash, value, token, timestamp).
   - Created fixture validation script in TypeScript (`validateFixtures.ts`) validating seeded fixtures against schemas.

3. **Role E (Smart Contract Test Suite)**:
   - Implemented full unit test suite for `EvidenceRegistry.sol` using Hardhat, Chai, and Ethers.
   - Verified hash storage, version increments, non-investigator rejections, owner transfer mechanics, and verification status checks.
   - Smoke tested Hardhat deployment scripts for Polygon Amoy.

---

### Phase 3: Graph Analytics, Detection, & Composite Risk (Completed & Merged)
*Objective: Implement real forensic algorithms, graph traversal, heuristic pattern detection, cycle detection, path ranking, and composite risk scoring.*

1. **Multi-Hop Traversal Engine (`traversal/multi_hop.py`)**:
   - Implemented manual DFS stack traversal originating from the suspect root address.
   - Avoided infinite cycles with path-local visited tracking.
   - Resolved multi-edge transaction keys and stable edge IDs across parallel transfers.

2. **Cycle & Circular Flow Detection (`detection/circular_flows.py`)**:
   - Utilized NetworkX simple cycle algorithms (`nx.simple_cycles`).
   - Filtered cycles containing the suspect root address, extracting participating node and edge sequences.

3. **Heuristic Suspicious Path Detection (`detection/suspicious_paths.py`)**:
   - Built pattern detection signals:
     - `rapid_movement`: Transfers occurring within a calibrated 30-minute window (1,800 seconds).
     - `fan_out_relay`: Multi-hop path originating from high out-degree fan-out nodes ($\ge 3$).
     - `dex_touchpoint`: Transfers routing through recognized DEX router contracts.
     - `bridge_touchpoint`: Transfers interacting with cross-chain bridge contracts.
     - `mixer_touchpoint`: Severe penalty for interactions with mixer pools (e.g. Tornado Cash).
     - `risky_label` / `ofac_sanctioned`: Direct or indirect association with OFAC-sanctioned addresses.
     - `high_value_flow`: Transactions exceeding USD value threshold ($5,000+).
     - `circular_return`: Paths overlapping with detected circular flow cycles.

4. **Path Ranking & Scoring (`ranking/path_ranker.py` & `scoring/risk_score.py`)**:
   - Developed weighted path scoring system based on behavioral signals.
   - Built composite risk scoring engine producing an explainable 0–100 risk score and mapped risk level (`low`, `medium`, `high`, `critical`).
   - Implemented deterministic sorting `(-score, id)` for repeatable path ranking.

5. **Pre-PR Self-Review & Hardening**:
   - Converted graph builder from `nx.DiGraph` to `nx.MultiDiGraph` to properly model parallel transactions between identical addresses without edge collisions.
   - Fixed TypeScript circular dependency in `@sih/shared-types` (`case.ts` vs `graph.ts`).
   - Calibrated heuristics to properly triage `seeded-case.json` (producing Risk Score: 50, Level: High, 2 Flagged Paths, 2 Findings).
   - Expanded Python test suite to 135 passing tests.
   - Successfully merged PR #4, PR #5, and PR #6 into `master`.

---

### Frontend Milestones (Phases 1–3 Completed)
- **Phase 1**: React + TypeScript + Vite project setup, layout structure, responsive navigation, and initial dashboard widgets.
- **Phase 2**: Case overview pages, transaction inspection tables, and interactive node-edge graph visualization.
- **Phase 3**: Integration with basic and advanced findings, visual indicator cards for suspicious paths, risk severity badges, and report generation/verification UI.

---

### Phase 4: Intelligence & Evidence Integration (v3 Plan - Current Status)
*Objective: Retroactively upgrade Phase 1-3 components to align with `BACKEND_PLAN_v3.md` requirements and implement advanced tracking capabilities.*

1. **Traversal Evolution (Fixed Depth → Confidence-Decay Search)**:
   - Replaced naive fixed-depth cutoff (`maxDepth = 3`) with dynamic confidence decay.
   - Created `traversal/confidence.py`: calculates exponential confidence decay per hop ($C_d = C_0 \cdot \lambda^d$).
   - Pruning criteria:
     - Stops when path confidence drops below `minConfidence` (default: 0.15).
     - Stops immediately at dead-end sink nodes (`isTraceableDeadEnd = True`).
     - Bounded by `hardCeilingDepth` (default: 10) and `hubThreshold` (prunes high-degree exchange hubs).

2. **Suspicion-First Priority Queue (`traversal/priority_queue.py`)**:
   - Replaced arbitrary DFS exploration order with a max-priority queue (min-heap with inverted priority).
   - Explores paths ordered by suspicious behavioral markers and confidence, ensuring the most illicit trails are evaluated first under compute/time budgets.

3. **Nearest-VASP Attribution Engine (`attribution/vasp_attribution.py`)**:
   - Solves the primary forensic requirement of SIH26182: locating the nearest regulated exchange/VASP where funds exited.
   - Evaluates traversed paths reaching `vasp` labeled nodes, calculating hop distance, attribution confidence, supporting path IDs, and secondary candidate alternatives.

4. **Schema Migrations for v3 (`schemas/request.py` & `schemas/response.py`)**:
   - `AnalysisRequest`: Added `minConfidence`, `decayFactor`, `hardCeilingDepth`, `hubThreshold`, and `isTraceableDeadEnd` / `outDegree` to `GraphNode`.
   - `AnalysisResponse`: Added `vaspAttribution` model (`VaspAttribution`).

---

## 4. Current Repository Structure

```text
SIH2026/
├── BACKEND_PLAN_v3.md                     ← Master backend specification (v3, 2-person team model)
├── FRONTEND_PLAN.md                       ← Master frontend specification
├── WORK_DONE.md                           ← This document (cumulative progress & context)
│
├── Backend/
│   ├── apps/
│   │   ├── api/                           ← Fastify Backend (Dev 1 / Role B)
│   │   │   ├── src/                       ← Routes, controllers, Prisma client, queues, workers
│   │   │   ├── datasets/                  ← address-labels.json & seeded-case.json (Role C)
│   │   │   ├── prisma/                    ← PostgreSQL schema & migrations
│   │   │   └── package.json
│   │   │
│   │   ├── intelligence/                  ← Python Intelligence Service (Dev 2 / Role D)
│   │   │   ├── app/
│   │   │   │   ├── main.py                ← FastAPI application entrypoint
│   │   │   │   ├── config.py              ← Environment configuration
│   │   │   │   ├── api/routes.py          ← /health and /v1/analyze endpoints
│   │   │   │   ├── schemas/               ← Pydantic request & response models (v3 aligned)
│   │   │   │   ├── graph/builder.py       ← MultiDiGraph construction
│   │   │   │   ├── traversal/             ← confidence.py, priority_queue.py, multi_hop.py
│   │   │   │   ├── detection/             ← suspicious_paths.py, circular_flows.py
│   │   │   │   ├── ranking/               ← path_ranker.py
│   │   │   │   ├── scoring/               ← risk_score.py
│   │   │   │   └── attribution/           ← vasp_attribution.py
│   │   │   ├── tests/                     ← Comprehensive pytest test suite
│   │   │   └── pyproject.toml             ← Poetry project definition
│   │   │
│   │   └── contracts/                     ← Blockchain Evidence Registry (Dev 2 / Role E)
│   │       ├── contracts/
│   │       │   └── EvidenceRegistry.sol   ← On-chain SHA-256 hash storage contract
│   │       ├── test/                      ← EvidenceRegistry.test.ts (Hardhat unit tests)
│   │       ├── scripts/                   ← deploy.ts, storeEvidence.ts, verifyEvidence.ts
│   │       └── hardhat.config.ts          ← Polygon Amoy configuration
│   │
│   └── packages/
│       └── shared-types/                  ← TypeScript DTO definitions across monorepo
│           ├── src/                       ← graph.ts, transaction.ts, case.ts, index.ts
│           └── scripts/                   ← validateFixtures.ts
│
└── Frontend/                              ← React Dashboard Application
    ├── src/
    │   ├── components/                    │ Case cards, graph renderer, findings lists
    │   ├── pages/                         │ Dashboard, Case View, Investigation, Verification
    │   └── services/                      │ API client communicating with Fastify
    └── package.json
```

---

## 5. Verification & Testing Overview

| Component | Test Mechanism | Current Status |
|---|---|---|
| **Python Intelligence** | `poetry run pytest` (in `Backend/apps/intelligence`) | 108+ passing tests (v3 schema migration updates being finalized) |
| **Shared Types** | `npx tsc --noEmit` (in `Backend/packages/shared-types`) | 0 compiler errors |
| **Seeded Fixtures** | `npx ts-node scripts/validateFixtures.ts` | 100% schema validation pass |
| **Smart Contract** | `npx hardhat test` (in `Backend/apps/contracts`) | All storage, versioning, and access control tests pass |
| **Fastify API** | `npm test` (in `Backend/apps/api`) | Health & seeded demo case endpoints functional |

---

## 6. Immediate Next Steps (To Finish Phase 4 & 5)

1. **Complete v3 Intelligence Test Updates**: Finish adjusting remaining legacy `maxDepth` test assertions in `test_schemas.py` and `test_traversal.py` to the new `minConfidence` and priority-queue traversal signatures.
2. **Fastify Orchestration Hookup (Dev 1 & Dev 2 interface)**: Dev 1 wires the Fastify analysis queue to call `POST /v1/analyze` on the Python service and stores the composite risk score, suspicious paths, and `vaspAttribution` in PostgreSQL.
3. **Report Generation & Ethers Anchoring**: Dev 1 triggers PDF report compilation, computes SHA-256 hash, and submits the hash to the deployed `EvidenceRegistry` contract.
4. **End-to-End Demo Triage**: Validate the complete flow using `seeded-case.json` through the UI from wallet input to on-chain verified evidence.
