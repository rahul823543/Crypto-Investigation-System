/**
 * packages/shared-types/scripts/validateFixtures.ts
 * ───────────────────────────────────────────────────
 * Role C — Phase 2 task: "Validate transaction fixtures"
 *
 * Proves that seeded-case.json and address-labels.json fully satisfy
 * the frozen shared-types DTOs before Role B's live normaliser is ready.
 *
 * Six check sections:
 *   1. Transactions      → NormalizedTransaction shape
 *   2. Graph nodes       → GraphNode shape + stable-ID format
 *   3. Graph edges       → GraphEdge shape + node cross-references
 *   4. basicFindings     → RiskFinding shape + node/edge cross-references
 *   5. analysisResult    → AnalysisResponse shape + node/edge cross-references
 *   6. Address labels    → AddressLabel shape
 *
 * Usage (from Backend/ root):
 *   npx ts-node -P packages/shared-types/tsconfig.json packages/shared-types/scripts/validateFixtures.ts
 *
 * Exit 0 = all checks passed.  Exit 1 = at least one failure.
 */

import * as fs from "fs";
import * as path from "path";

import type { NormalizedTransaction, AnalysisResponse } from "../src/transaction";
import type { RiskLevel } from "../src/case";
import type { RiskFinding } from "../src/finding";
import type {
  GraphNode,
  GraphEdge,
  AddressLabel,
  NodeType,
  AddressLabelType,
} from "../src/graph";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const DATASETS_DIR = path.resolve(__dirname, "../../../apps/api/datasets");
const seeded = JSON.parse(fs.readFileSync(path.join(DATASETS_DIR, "seeded-case.json"), "utf-8"));
const addressLabels: AddressLabel[] = JSON.parse(
  fs.readFileSync(path.join(DATASETS_DIR, "address-labels.json"), "utf-8")
);

// ---------------------------------------------------------------------------
// Allowed value sets (mirrors the shared-types Literal unions)
// ---------------------------------------------------------------------------

const VALID_NODE_TYPES    = new Set<string>(["wallet","contract","dex","bridge","mixer","unknown"]);
const VALID_RISK_LEVELS   = new Set<RiskLevel>(["low","medium","high","critical"]);
const VALID_LABEL_TYPES   = new Set<AddressLabelType>(["dex","bridge","mixer","risky","ofac"]);
const VALID_FINDING_SRC   = new Set(["basic-risk","python-intelligence"]);
const VALID_TRANSFER_TYPE = new Set(["native","erc20"]);

// ---------------------------------------------------------------------------
// Reporter
// ---------------------------------------------------------------------------

let failures = 0;
const fail = (msg: string) => { console.error(`  [FAIL] ${msg}`); failures++; };
const pass = (msg: string) => console.log(`  [PASS] ${msg}`);
const section = (t: string) => console.log(`\n── ${t} ${"─".repeat(Math.max(0, 60 - t.length - 4))}`);

// ---------------------------------------------------------------------------
// 1. Transactions → NormalizedTransaction
// ---------------------------------------------------------------------------

section("1. Transactions → NormalizedTransaction");

const txs: NormalizedTransaction[] = seeded.transactions;
for (const tx of txs) {
  if (!tx.id)                                    fail(`${tx.id}: missing id`);
  if (!tx.caseId)                                fail(`${tx.id}: missing caseId`);
  if (!tx.hash?.startsWith("0x"))                fail(`${tx.id}: hash must start with 0x`);
  if (typeof tx.chainId !== "number")            fail(`${tx.id}: chainId must be number`);
  if (typeof tx.blockNumber !== "number")        fail(`${tx.id}: blockNumber must be number`);
  if (!tx.from?.startsWith("0x"))               fail(`${tx.id}: from must be 0x address`);
  if (!tx.to?.startsWith("0x"))                 fail(`${tx.id}: to must be 0x address`);
  if (!tx.asset)                                 fail(`${tx.id}: missing asset`);
  if (!tx.amount)                                fail(`${tx.id}: missing amount`);
  if (typeof tx.amountUsd !== "number")          fail(`${tx.id}: amountUsd must be number`);
  if (!tx.timestamp)                             fail(`${tx.id}: missing timestamp`);
  if (!VALID_TRANSFER_TYPE.has(tx.transferType)) fail(`${tx.id}: invalid transferType '${tx.transferType}'`);
  if (tx.tokenAddress !== null && !tx.tokenAddress?.startsWith("0x"))
                                                 fail(`${tx.id}: tokenAddress must be 0x or null`);
}
pass(`${txs.length} / ${txs.length} transactions satisfy NormalizedTransaction`);

// ---------------------------------------------------------------------------
// 2. Graph nodes → GraphNode
// ---------------------------------------------------------------------------

section("2. Graph Nodes → GraphNode");

const nodes: GraphNode[] = seeded.graph.nodes;
const nodeIds = new Set(nodes.map((n: GraphNode) => n.id));

for (const node of nodes) {
  if (!node.id?.includes(":"))                      fail(`${node.id}: id must be 'type:0x...'`);
  if (!node.address?.startsWith("0x"))             fail(`${node.id}: address must be 0x`);
  if (!VALID_NODE_TYPES.has(node.type as NodeType)) fail(`${node.id}: invalid type '${node.type}'`);
  if (!Array.isArray(node.labels))                 fail(`${node.id}: labels must be array`);
  if (!VALID_RISK_LEVELS.has(node.riskLevel as RiskLevel)) fail(`${node.id}: invalid riskLevel`);
  if (typeof node.totalInUsd !== "number")          fail(`${node.id}: totalInUsd must be number`);
  if (typeof node.totalOutUsd !== "number")         fail(`${node.id}: totalOutUsd must be number`);
}
pass(`${nodes.length} / ${nodes.length} nodes satisfy GraphNode`);

// ---------------------------------------------------------------------------
// 3. Graph edges → GraphEdge (+ cross-reference)
// ---------------------------------------------------------------------------

section("3. Graph Edges → GraphEdge");

const edges: GraphEdge[] = seeded.graph.edges;
const edgeIds = new Set(edges.map((e: GraphEdge) => e.id));

for (const edge of edges) {
  if (!edge.id?.startsWith("edge:"))               fail(`${edge.id}: id must start with 'edge:'`);
  if (!nodeIds.has(edge.from!))                     fail(`${edge.id}: from '${edge.from}' not in nodes`);
  if (!nodeIds.has(edge.to!))                       fail(`${edge.id}: to '${edge.to}' not in nodes`);
  if (!edge.transactionHash?.startsWith("0x"))     fail(`${edge.id}: transactionHash must be 0x`);
  if (!edge.asset)                                 fail(`${edge.id}: missing asset`);
  if (!edge.amount)                                fail(`${edge.id}: missing amount`);
  if (typeof edge.amountUsd !== "number")          fail(`${edge.id}: amountUsd must be number`);
  if (!edge.timestamp)                             fail(`${edge.id}: missing timestamp`);
  if (typeof edge.hopDepth !== "number" || edge.hopDepth < 1) fail(`${edge.id}: hopDepth must be >= 1`);
  if (!VALID_RISK_LEVELS.has(edge.riskLevel as RiskLevel)) fail(`${edge.id}: invalid riskLevel`);
}
pass(`${edges.length} / ${edges.length} edges satisfy GraphEdge`);

// ---------------------------------------------------------------------------
// 4. basicFindings → RiskFinding (+ cross-reference)
// ---------------------------------------------------------------------------

section("4. Basic Findings → RiskFinding");

const findings: RiskFinding[] = seeded.basicFindings;
for (const f of findings) {
  if (!f.id)                                        fail(`${f.id}: missing id`);
  if (!VALID_FINDING_SRC.has(f.source))             fail(`${f.id}: invalid source '${f.source}'`);
  if (!VALID_RISK_LEVELS.has(f.severity as RiskLevel)) fail(`${f.id}: invalid severity`);
  if (typeof f.confidence !== "number" || f.confidence < 0 || f.confidence > 1)
                                                    fail(`${f.id}: confidence must be 0.0–1.0`);
  if (!f.title || !f.description)                  fail(`${f.id}: missing title or description`);
  for (const nid of f.relatedNodeIds ?? []) {
    if (!nodeIds.has(nid)) fail(`Finding ${f.id}: relatedNodeId '${nid}' not in graph`);
  }
  for (const eid of f.relatedEdgeIds ?? []) {
    if (!edgeIds.has(eid)) fail(`Finding ${f.id}: relatedEdgeId '${eid}' not in graph`);
  }
}
pass(`${findings.length} / ${findings.length} basicFindings satisfy RiskFinding + cross-refs`);

// ---------------------------------------------------------------------------
// 5. analysisResult → AnalysisResponse (+ cross-reference)
// ---------------------------------------------------------------------------

section("5. analysisResult → AnalysisResponse");

const ar: AnalysisResponse = seeded.analysisResult;
if (!ar.analysisId)                                fail("missing analysisId");
if (!ar.caseId)                                    fail("missing caseId");
if (typeof ar.riskScore !== "number" || ar.riskScore < 0 || ar.riskScore > 100)
                                                   fail("riskScore must be 0–100");
if (!VALID_RISK_LEVELS.has(ar.riskLevel as RiskLevel)) fail(`invalid riskLevel '${ar.riskLevel}'`);
if (!ar.analysisMetadata?.engineVersion)           fail("missing analysisMetadata.engineVersion");

for (const sp of ar.suspiciousPaths ?? []) {
  for (const nid of sp.nodeIds) {
    if (!nodeIds.has(nid)) fail(`Path ${sp.id}: nodeId '${nid}' not in graph`);
  }
  for (const eid of sp.edgeIds) {
    if (!edgeIds.has(eid)) fail(`Path ${sp.id}: edgeId '${eid}' not in graph`);
  }
}
pass("analysisResult satisfies AnalysisResponse + cross-refs");

// ---------------------------------------------------------------------------
// 6. Address labels → AddressLabel
// ---------------------------------------------------------------------------

section("6. Address Labels → AddressLabel");

for (const label of addressLabels) {
  if (!label.address?.startsWith("0x"))            fail(`'${label.label}': address must be 0x`);
  if (!VALID_LABEL_TYPES.has(label.type as AddressLabelType)) fail(`'${label.label}': invalid type '${label.type}'`);
  if (!label.label)                                fail(`${label.address}: missing label`);
  if (label.chainId !== null && typeof label.chainId !== "number")
                                                   fail(`'${label.label}': chainId must be number or null`);
}
pass(`${addressLabels.length} / ${addressLabels.length} address labels satisfy AddressLabel`);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log("\n" + "═".repeat(64));
if (failures === 0) {
  console.log("✅  All fixture validation checks PASSED — fixtures are graph-ready.");
  process.exit(0);
} else {
  console.error(`❌  ${failures} check(s) FAILED — fix before Phase 3.`);
  process.exit(1);
}
