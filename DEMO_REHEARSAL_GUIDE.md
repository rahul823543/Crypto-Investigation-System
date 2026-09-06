# Forensic Triage Engine — Final Demonstration & Rehearsal Guide
## Smart India Hackathon 2026 — Problem Statement SIH26182
**Roles C, D, E Integration & Delivery Blueprint**

---

## 1. Executive Demo Flow & Timeline (10-Minute Presentation)

| Time | Stage | Key Takeaways & Visuals | Technical Component |
|:---:|---|---|---|
| **0:00 - 1:30** | **Problem Statement & System Overview** | Challenge: Layering, DEX swaps, mixer obfuscation, and subpoena delays. Solution: Automated triage + nearest-VASP attribution + blockchain evidence anchoring. | Architecture Overview |
| **1:30 - 3:30** | **Case Ingestion & Seeded Case Fallback** | Ingest target wallet `0x1234...1234`. Demonstrate zero-downtime offline fallback via cached fixture (`seeded-case.json`). | Role B Fastify API + Role C Datasets |
| **3:30 - 5:30** | **Graph Multigraph & Entity Classification** | Directed multigraph rendered with 6 nodes, 5 edges. Classified entities: DEX router (QuickSwap), Wallets, and Mixer touchpoints. Explain `isTraceableDeadEnd` flag. | Role C Node Classification & Detectors |
| **5:30 - 7:30** | **Algorithmic Traversal & Risk Scoring** | Explain **Behavioral Priority Queue** (ordering by fan-out and rapid relay, not dollar value) and **Exponential Confidence Decay** ($C(n) = C_0 \cdot \lambda^n$). Composite Risk Score = **50 (High)**. | Role D Python Intelligence Service |
| **7:30 - 9:00** | **Nearest-VASP Attribution & Scenarios** | Demonstrate Binance VASP attribution at 4 hops ($C=0.1785$). Show circular flow detection ($C_1$, +35 pts) and Tornado Cash dead-end pruning. | Role D Attribution Engine |
| **9:00 - 10:00** | **Cryptographic Proof & Chain-of-Custody** | SHA-256 hash of final forensic PDF matched against `EvidenceRegistry.sol` on Polygon Amoy testnet. Tamper-evident verification proof. | Role E Solidity Smart Contract |

---

## 2. Step-by-Step Live Rehearsal Script

### Step 1: Starting the Services
Ensure both backend runtimes are running:

```powershell
# Terminal 1: Python Intelligence Service (Port 8000)
cd c:\Farzi_New\SIH2026\Backend\apps\intelligence
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Node.js API Service (Port 3000)
cd c:\Farzi_New\SIH2026\Backend\apps\api
npm run dev
```

### Step 2: Ingesting the Demo Investigation
Target suspect wallet:
- Address: `0x1234567890abcdef1234567890abcdef12345678`
- Chain: Polygon Amoy (`chainId: 80002`)
- Mode: `demo` (Uses pre-seeded high-fidelity transaction telemetry)

API Request:
```bash
curl -X POST http://localhost:3000/cases \
  -H "Content-Type: application/json" \
  -d '{"rootAddress": "0x1234567890abcdef1234567890abcdef12345678", "chainId": 80002, "mode": "demo"}'
```

### Step 3: Inspecting Forensic Graph & Classification
- **Nodes**: 6 entities with stable prefixes (`wallet:...`, `dex:...`).
- **Edges**: 5 transactions tracking $15,000 USDC dispersion.
- **Rule Detectors Fired (Role C)**:
  1. `fan_out`: 4 unique addresses within 7 minutes ($\Delta t < 30\text{ min}$). Severity: **High**.
  2. `dex_interaction`: $5,000 swap through QuickSwap router. Severity: **Medium**.

### Step 4: Python Advanced Intelligence Run
The Node.js orchestrator calls Python `POST /v1/analyze`:
- **Traversal Pruning**: Confidence decay stops automatically at hop 5 ($C(5) = 0.116 < 0.15$).
- **Priority Queue**: The rapid relay path `[Root -> W2 -> W4]` scores **75 points** (fan-out relay + rapid movement + high value) and is placed at **Rank 1**.
- **Composite Risk Score**:
  $$\Phi_{\text{path}} = \lfloor (75/100) \times 60 \rfloor = 45$$
  $$\Phi_{\text{cycles}} = 0$$
  $$\Phi_{\text{findings}} = 1 \times 5 = 5$$
  $$\text{Total Score} = 45 + 0 + 5 = 50 \implies \mathbf{High}$$

### Step 5: Synthetic Scenarios Demonstration (Edge Cases)
Demonstrate the four validated Phase 5 scenarios to prove engine robustness:

1. **Circular Wash Flow (`circular_flow.json`)**:
   - Loops funds: `Root -> Mule -> QuickSwap DEX -> Root`.
   - Directed cycle of length 3 detected (`cycle_001`).
   - Flagged with `circular_return` (+35 points) $\implies$ **Score: 80 (Critical)**.
   - Branch to Tornado Cash marked as `isTraceableDeadEnd: true` $\implies$ Traversal halts cleanly.

2. **Nearest-VASP Subpoena Attribution (`dex_bridge_hop.json`)**:
   - Trail: `Root -> QuickSwap -> Polygon PoS Bridge -> Cashout Mule -> Binance Deposit`.
   - VASP Attribution Engine outputs:
     - `attributedVasp`: **"Binance"**
     - `vaspNodeId`: `vasp:0x28c6c06298d514db089934071355e5743bf21d60`
     - `hopDistance`: **4**
     - `confidence`: **0.1785** ($1.0 \times 0.65^4$)
     - `basis`: *"Connected via 4 hops to labeled Binance deposit"*

3. **Empty Graph Graceful Degradation (`empty_graph.json`)**:
   - Zero transactions: returns score **0 (Low)**, null attribution, zeroed findings without throwing exceptions.

---

## 3. Cryptographic Chain-of-Custody Verification

Explain the legal admissibility mechanism anchored on Polygon Amoy:
1. The case report is finalized into a deterministic PDF document.
2. The SHA-256 digest is computed:
   $$H_{\text{report}} = \text{SHA-256}(\text{PDF bytes})$$
3. Transaction hash on Polygon Amoy logs the event:
   ```solidity
   event EvidenceAnchored(
       string indexed caseId,
       bytes32 indexed reportHash,
       address indexed investigator,
       uint256 version,
       uint256 timestamp
   );
   ```
4. **Verification Endpoint**: `POST /evidence/verify` checks uploaded PDF against contract state $\mathcal{M}[\text{caseId}][\text{version}]$.

---

## 4. Failure Mode & Offline Fallback Checklist

| Potential Live Demo Glitch | Fallback Mechanism | Action |
|---|---|---|
| **EVM RPC Failure / Rate Limit** | Seeded Case Auto-Fallback | The system automatically serves `seeded-case.json` with zero UI latency. |
| **Python Intelligence Offline** | Node.js Basic Risk Degradation | The system continues operating using Role C basic findings (Score: 78, Fan-out detected). |
| **Polygon Amoy Testnet Down** | Local Hardhat Node / Seeded Verification | Pre-calculated report hash `0xabcdef...` stored in local case database proves verification predicate. |
| **Database Connection Blip** | In-Memory Fixtures | Full analysis pipeline executes directly from JSON fixtures without touching PostgreSQL. |

---

## 5. Verification Commands for Judges

Run these one-line commands during technical evaluation to prove test coverage:

```powershell
# 1. Run all 174 Python Intelligence Tests (Traversal, Scoring, Scenarios, Attribution)
cd c:\Farzi_New\SIH2026\Backend\apps\intelligence
poetry run pytest

# 2. Run TypeScript Shared DTO & Fixture Validation
cd c:\Farzi_New\SIH2026\Backend
npx ts-node -P packages/shared-types/tsconfig.json packages/shared-types/scripts/validateFixtures.ts
```
