# Crypto Investigation System (CIS) — Backend

Forensic intelligence and on-chain blockchain transaction triage backend built for law enforcement, regulatory bodies, and compliance investigators.

---

## 1. Prerequisites

- **Node.js**: v20.x or v22.x+
- **npm**: v10+
- **Docker & Docker Compose**: for local PostgreSQL 16 & Redis 7
- **Python**: v3.11+ (for Python FastAPI Intelligence Service in `apps/intelligence`)

---

## 2. Environment Variables & Setup

Copy the environment sample file:

```bash
cp Backend/.env.sample Backend/apps/api/.env
```

### Key Configuration Variables

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | API server listening port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://sih:sih_password@localhost:5432/sih_forensic` |
| `REDIS_URL` | Redis connection string for BullMQ | `redis://localhost:6379` |
| `ALCHEMY_API_URL` | Alchemy RPC endpoint (Polygon Amoy / Ethereum) | `https://polygon-amoy.g.alchemy.com/v2/<API_KEY>` |
| `INTELLIGENCE_API_URL`| Python Intelligence Service URL | `http://localhost:8000` |
| `EVIDENCE_CONTRACT_ADDRESS` | On-Chain Evidence Registry address *(optional)* | `0x...` |
| `EVIDENCE_RPC_URL` | Blockchain RPC for Evidence Verification *(optional)*| `https://rpc-amoy.polygon.technology/` |
| `RELAYER_PRIVATE_KEY` | EOA Private Key for anchoring evidence *(optional)* | `0x...` |
| `EVIDENCE_CHAIN_ID` | Chain ID for evidence contract *(optional)* | `80002` |

---

## 3. Infrastructure & Migrations

### One-click Windows startup

From the repository root, run `START_ALL.bat`. It starts Docker (PostgreSQL +
Redis), applies migrations, installs Python dependencies when needed, and opens
separate windows for intelligence, API, workers, and frontend. Then open
http://127.0.0.1:5173.

The launcher uses `Backend/.env` as the source of truth for Postgres
credentials, so Docker and the API cannot accidentally use different users or
passwords.

### 3.1 Start Local Databases (PostgreSQL & Redis)

From the `Backend/` root directory:

```bash
docker compose up -d
```

### 3.2 Run Prisma Migrations

Navigate to the API app directory and apply all database migrations:

```bash
cd Backend/apps/api
npx prisma migrate deploy
```

*(To inspect the database via GUI, you can run `npx prisma studio`.)*

---

## 4. Starting the Services

### 4.1 Start the API Server

```bash
cd Backend/apps/api
npm run dev
# Server will listen on http://localhost:3000
```

### 4.2 Start the Background Workers

In a separate terminal:

```bash
cd Backend/apps/api
npm run dev:worker
```
*(Runs BullMQ workers for `ingest-case-transactions`, `build-case-graph`, and `analyze-case`.)*

### 4.3 Start the Python Intelligence Service

In a separate terminal:

```bash
cd Backend/apps/intelligence
python -m venv .venv
source .venv/bin/activate  # Or on Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 5. Demo-Mode vs Live-Mode

- **Demo Mode (`mode: "demo"`)**:
  - Offline-resilient and deterministic.
  - Ingestion falls back cleanly to high-fidelity seeded dataset (`datasets/seeded-case.json`).
  - Graph construction, risk detection (mixers, peeling chains, fan-outs, VASP touches), intelligence analysis, PDF report generation, and evidence verification execute end-to-end even with zero internet connectivity or API credits.
- **Live Mode (`mode: "live"`)**:
  - Directly queries Alchemy (`alchemy_getAssetTransfers`) across native and ERC-20 transfers.
  - Automatically deduplicates and normalizes real-time on-chain movements.

---

## 6. End-to-End Demo Case Walkthrough (cURL Sequence)

Run the full demo pipeline from start to finish:

### Step 1: Create Case in Demo Mode

```bash
curl -X POST http://localhost:3000/cases \
  -H "Content-Type: application/json" \
  -d '{
    "rootAddress": "0x71C84167b3A8E008F56037856d116A179c735F60",
    "chainId": 80002,
    "mode": "demo"
  }'
```
*Save the returned `case.id` (e.g., `CASE_ID="case_123"`).*

### Step 2: Ingestion & Graph Building Status

Check case status until `graph_ready`:

```bash
curl http://localhost:3000/cases/$CASE_ID
```

View the generated graph and risk findings:

```bash
curl http://localhost:3000/cases/$CASE_ID/graph
curl http://localhost:3000/cases/$CASE_ID/findings
```

### Step 3: Trigger Intelligence Analysis

```bash
curl -X POST http://localhost:3000/cases/$CASE_ID/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "minConfidence": 0.3,
    "decayFactor": 0.85,
    "hardCeilingDepth": 10
  }'
```

### Step 4: Inspect Analysis & Nearest-VASP Attribution

```bash
curl http://localhost:3000/cases/$CASE_ID/analysis
curl http://localhost:3000/cases/$CASE_ID/attribution
```

### Step 5: Generate Forensic PDF Report

```bash
curl -X POST http://localhost:3000/cases/$CASE_ID/reports
```
*Save the returned `report.id` (e.g., `REPORT_ID="rep_123"`).*

### Step 6: Anchor Evidence On-Chain

```bash
curl -X POST http://localhost:3000/cases/$CASE_ID/evidence \
  -H "Content-Type: application/json" \
  -d '{
    "reportId": "'$REPORT_ID'"
  }'
```

### Step 7: Verify On-Chain Integrity

```bash
curl -X POST http://localhost:3000/evidence/verify \
  -H "Content-Type: application/json" \
  -d '{
    "caseId": "'$CASE_ID'",
    "reportId": "'$REPORT_ID'"
  }'
```

---

## 7. Running Automated Tests

Run the complete test suite:

```bash
cd Backend/apps/api
npm test
```
All unit tests, validation schemas, pipeline E2E tests, and live fastify-inject database tests run and verify all components.
