import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";

interface TestResult {
  testNum: number | string;
  endpoint: string;
  expected: string;
  actualStatus: number;
  responseBody: any;
  durationMs: number;
  pass: boolean;
  notes?: string;
}

function extractCaseId(body: any): string {
  if (!body) return "";
  if (typeof body === "string") return body;
  return body.case?.id || body.id || "";
}

function extractReportId(body: any): string {
  if (!body) return "";
  return body.report?.id || body.id || "";
}

async function request(
  method: string,
  urlPath: string,
  options: {
    body?: any;
    headers?: Record<string, string>;
    rawBody?: string;
  } = {}
) {
  const url = `${BASE_URL}${urlPath}`;
  const start = performance.now();
  const res = await fetch(url, {
    method,
    headers: options.headers === undefined && (options.body !== undefined || options.rawBody !== undefined)
      ? { "Content-Type": "application/json" }
      : options.headers,
    body: options.rawBody !== undefined
      ? options.rawBody
      : options.body !== undefined
      ? JSON.stringify(options.body)
      : undefined,
  });
  const durationMs = performance.now() - start;

  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  return {
    status: res.status,
    headers: Object.fromEntries(res.headers.entries()),
    body: json,
    rawText: text,
    durationMs,
  };
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollCaseStatus(caseId: string, targetStatus: string, maxWaitMs = 45000) {
  const start = Date.now();
  const transitions: { status: string; elapsedMs: number }[] = [];
  let lastStatus = "";

  while (Date.now() - start < maxWaitMs) {
    const res = await request("GET", `/cases/${caseId}`);
    const currentStatus = res.body?.case?.status || res.body?.status;
    if (currentStatus && currentStatus !== lastStatus) {
      transitions.push({ status: currentStatus, elapsedMs: Date.now() - start });
      lastStatus = currentStatus;
    }
    if (currentStatus === targetStatus || currentStatus === "failed") {
      return { finalRes: res, transitions };
    }
    await sleep(250);
  }
  const finalRes = await request("GET", `/cases/${caseId}`);
  return { finalRes, transitions };
}

async function runVerification() {
  console.log("=== STARTING FULL LIVE API RE-VERIFICATION ===\n");

  const results: TestResult[] = [];

  // ==========================================
  // PART A: COLLISION FIX VERIFICATION
  // ==========================================
  console.log("------------------------------------------");
  console.log("PART A: Collision Fix Verification");
  console.log("------------------------------------------\n");

  // A.1: Create Case A
  console.log("A.1: Creating Case A with rootAddress 0xb09712FeB42F0Ee945180B17EE1f3488F2E7d3F3...");
  const createCaseARes = await request("POST", "/cases", {
    body: {
      rootAddress: "0xb09712FeB42F0Ee945180B17EE1f3488F2E7d3F3",
      chainId: 80002,
      mode: "demo",
    },
  });
  console.log(`Case A created -> HTTP ${createCaseARes.status}:`, JSON.stringify(createCaseARes.body, null, 2));
  const caseAId = extractCaseId(createCaseARes.body);
  console.log(`Case A ID: ${caseAId}`);

  console.log(`Polling Case A (${caseAId}) until graph_ready...`);
  const pollA = await pollCaseStatus(caseAId, "graph_ready");
  console.log("Case A transitions:", pollA.transitions);

  const graphARes1 = await request("GET", `/cases/${caseAId}/graph`);
  const nodeCountA1 = graphARes1.body?.nodes?.length ?? 0;
  const edgeCountA1 = graphARes1.body?.edges?.length ?? 0;
  console.log(`Case A Graph 1: ${nodeCountA1} nodes, ${edgeCountA1} edges`);
  console.log("Sample Case A Node IDs:", graphARes1.body?.nodes?.slice(0, 3).map((n: any) => n.id));
  console.log("Sample Case A Edge IDs:", graphARes1.body?.edges?.slice(0, 3).map((e: any) => e.id));

  // A.2: Create Case B with EXACT SAME rootAddress
  console.log("\nA.2: Creating Case B with EXACT SAME rootAddress...");
  const createCaseBRes = await request("POST", "/cases", {
    body: {
      rootAddress: "0xb09712FeB42F0Ee945180B17EE1f3488F2E7d3F3",
      chainId: 80002,
      mode: "demo",
    },
  });
  console.log(`Case B created -> HTTP ${createCaseBRes.status}:`, JSON.stringify(createCaseBRes.body, null, 2));
  const caseBId = extractCaseId(createCaseBRes.body);
  console.log(`Case B ID: ${caseBId}`);

  console.log(`Polling Case B (${caseBId}) until graph_ready...`);
  const pollB = await pollCaseStatus(caseBId, "graph_ready");
  console.log("Case B transitions:", pollB.transitions);

  const graphBRes = await request("GET", `/cases/${caseBId}/graph`);
  const nodeCountB = graphBRes.body?.nodes?.length ?? 0;
  const edgeCountB = graphBRes.body?.edges?.length ?? 0;
  console.log(`Case B Graph: ${nodeCountB} nodes, ${edgeCountB} edges`);
  console.log("Sample Case B Node IDs:", graphBRes.body?.nodes?.slice(0, 3).map((n: any) => n.id));
  console.log("Sample Case B Edge IDs:", graphBRes.body?.edges?.slice(0, 3).map((e: any) => e.id));

  // A.3: Confirm Case A is unchanged
  console.log("\nA.3: Checking Case A graph again...");
  const graphARes2 = await request("GET", `/cases/${caseAId}/graph`);
  const nodeCountA2 = graphARes2.body?.nodes?.length ?? 0;
  const edgeCountA2 = graphARes2.body?.edges?.length ?? 0;
  console.log(`Case A Graph 2: ${nodeCountA2} nodes, ${edgeCountA2} edges`);

  // A.4: Check Findings & related IDs
  console.log("\nA.4: Checking Findings for Case A and Case B...");
  const findingsARes = await request("GET", `/cases/${caseAId}/findings`);
  const findingsBRes = await request("GET", `/cases/${caseBId}/findings`);

  const nodeSetA = new Set(graphARes1.body?.nodes?.map((n: any) => n.id) || []);
  const edgeSetA = new Set(graphARes1.body?.edges?.map((e: any) => e.id) || []);
  const nodeSetB = new Set(graphBRes.body?.nodes?.map((n: any) => n.id) || []);
  const edgeSetB = new Set(graphBRes.body?.edges?.map((e: any) => e.id) || []);

  let findingMismatchA = false;
  let findingMismatchB = false;

  console.log(`Case A findings count: ${findingsARes.body?.findings?.length}`);
  for (const f of findingsARes.body?.findings || []) {
    for (const nid of f.relatedNodeIds || []) {
      if (!nodeSetA.has(nid)) {
        console.error(`Mismatch in Case A finding ${f.id}: relatedNodeId ${nid} not in Case A nodes!`);
        findingMismatchA = true;
      }
    }
    for (const eid of f.relatedEdgeIds || []) {
      if (!edgeSetA.has(eid)) {
        console.error(`Mismatch in Case A finding ${f.id}: relatedEdgeId ${eid} not in Case A edges!`);
        findingMismatchA = true;
      }
    }
  }

  console.log(`Case B findings count: ${findingsBRes.body?.findings?.length}`);
  for (const f of findingsBRes.body?.findings || []) {
    for (const nid of f.relatedNodeIds || []) {
      if (!nodeSetB.has(nid)) {
        console.error(`Mismatch in Case B finding ${f.id}: relatedNodeId ${nid} not in Case B nodes!`);
        findingMismatchB = true;
      }
    }
    for (const eid of f.relatedEdgeIds || []) {
      if (!edgeSetB.has(eid)) {
        console.error(`Mismatch in Case B finding ${f.id}: relatedEdgeId ${eid} not in Case B edges!`);
        findingMismatchB = true;
      }
    }
  }

  const partAPass =
    nodeCountA1 > 0 &&
    edgeCountA1 > 0 &&
    nodeCountB > 0 &&
    edgeCountB > 0 &&
    nodeCountA1 === nodeCountA2 &&
    edgeCountA1 === edgeCountA2 &&
    !findingMismatchA &&
    !findingMismatchB;

  console.log("\n>>> PART A SUMMARY RESULT:", partAPass ? "PASS" : "FAIL");

  // ==========================================
  // PART B: FULL 28 ENDPOINT RE-VERIFICATION
  // ==========================================
  console.log("\n------------------------------------------");
  console.log("PART B: Full 28 Endpoint Re-Verification");
  console.log("------------------------------------------\n");

  const testCaseId = caseAId;
  let createdReportId = "";

  // Test 1: GET /health
  const t1 = await request("GET", "/health");
  results.push({
    testNum: 1,
    endpoint: "GET /health",
    expected: "200 { status: 'ok' }",
    actualStatus: t1.status,
    responseBody: t1.body,
    durationMs: t1.durationMs,
    pass: t1.status === 200 && t1.body?.status === "ok",
  });

  // Test 2: GET /cases
  const t2 = await request("GET", "/cases");
  const casesList2 = t2.body?.cases || (Array.isArray(t2.body) ? t2.body : []);
  results.push({
    testNum: 2,
    endpoint: "GET /cases",
    expected: "200, list includes recent cases",
    actualStatus: t2.status,
    responseBody: { count: casesList2.length, sample: casesList2.slice(0, 2) },
    durationMs: t2.durationMs,
    pass: t2.status === 200 && Array.isArray(casesList2) && casesList2.length > 0,
  });

  // Test 3: GET /cases?page=1&limit=5
  const t3 = await request("GET", "/cases?limit=5");
  const casesList3 = t3.body?.cases || (Array.isArray(t3.body) ? t3.body : []);
  results.push({
    testNum: 3,
    endpoint: "GET /cases?page=1&limit=5",
    expected: "200, pagination metadata + max 5 items",
    actualStatus: t3.status,
    responseBody: { count: casesList3.length, nextCursor: t3.body?.nextCursor },
    durationMs: t3.durationMs,
    pass: t3.status === 200 && casesList3.length <= 5,
  });

  // Test 4: POST /cases (valid demo case)
  const t4 = await request("POST", "/cases", {
    body: {
      rootAddress: "0xb09712FeB42F0Ee945180B17EE1f3488F2E7d3F3",
      chainId: 80002,
      mode: "demo",
    },
  });
  const t4CaseId = extractCaseId(t4.body);
  results.push({
    testNum: 4,
    endpoint: "POST /cases",
    expected: "201, case created with status 'created'",
    actualStatus: t4.status,
    responseBody: t4.body,
    durationMs: t4.durationMs,
    pass: t4.status === 201 && !!t4CaseId,
  });

  // Test 5: POST /cases (same address again)
  const t5 = await request("POST", "/cases", {
    body: {
      rootAddress: "0xb09712FeB42F0Ee945180B17EE1f3488F2E7d3F3",
      chainId: 80002,
      mode: "demo",
    },
  });
  const t5CaseId = extractCaseId(t5.body);
  results.push({
    testNum: 5,
    endpoint: "POST /cases (duplicate address allowed)",
    expected: "201, new case created independently",
    actualStatus: t5.status,
    responseBody: t5.body,
    durationMs: t5.durationMs,
    pass: t5.status === 201 && !!t5CaseId && t5CaseId !== t4CaseId,
  });

  // Test 6: POST /cases (invalid body: bad address, negative chainId)
  const t6 = await request("POST", "/cases", {
    body: {
      rootAddress: "not-an-eth-address",
      chainId: -1,
      mode: "demo",
    },
  });
  results.push({
    testNum: 6,
    endpoint: "POST /cases (invalid body)",
    expected: "400 Bad Request",
    actualStatus: t6.status,
    responseBody: t6.body,
    durationMs: t6.durationMs,
    pass: t6.status === 400,
  });

  // Test 7: GET /cases/{caseId} polled until graph_ready
  const pollT7 = await pollCaseStatus(testCaseId, "graph_ready");
  const t7Case = pollT7.finalRes.body?.case || pollT7.finalRes.body;
  results.push({
    testNum: 7,
    endpoint: `GET /cases/${testCaseId} (polled to graph_ready)`,
    expected: "200, status reaches 'graph_ready'",
    actualStatus: pollT7.finalRes.status,
    responseBody: {
      status: t7Case?.status,
      riskScore: t7Case?.riskScore,
      riskLevel: t7Case?.riskLevel,
      transitions: pollT7.transitions,
    },
    durationMs: pollT7.finalRes.durationMs,
    pass: pollT7.finalRes.status === 200 && t7Case?.status === "graph_ready",
  });

  // Test 8: GET /cases/does-not-exist
  const t8 = await request("GET", "/cases/non_existent_cuid_99999");
  results.push({
    testNum: 8,
    endpoint: "GET /cases/non_existent_cuid_99999",
    expected: "404 Not Found",
    actualStatus: t8.status,
    responseBody: t8.body,
    durationMs: t8.durationMs,
    pass: t8.status === 404,
  });

  // Test 9: GET /cases/{caseId}/transactions
  const t9 = await request("GET", `/cases/${testCaseId}/transactions`);
  const txCount = t9.body?.transactions?.length ?? t9.body?.length ?? 0;
  results.push({
    testNum: 9,
    endpoint: `GET /cases/${testCaseId}/transactions`,
    expected: "200, non-empty transactions list",
    actualStatus: t9.status,
    responseBody: {
      count: txCount,
      sample: (t9.body?.transactions || t9.body)?.slice(0, 1),
    },
    durationMs: t9.durationMs,
    pass: t9.status === 200 && txCount > 0,
  });

  // Test 10: GET /cases/{caseId}/graph
  const t10 = await request("GET", `/cases/${testCaseId}/graph`);
  const nodeLen = t10.body?.nodes?.length ?? 0;
  const edgeLen = t10.body?.edges?.length ?? 0;
  results.push({
    testNum: 10,
    endpoint: `GET /cases/${testCaseId}/graph`,
    expected: "200, NON-EMPTY nodes AND edges",
    actualStatus: t10.status,
    responseBody: {
      nodesCount: nodeLen,
      edgesCount: edgeLen,
      sampleNode: t10.body?.nodes?.[0],
      sampleEdge: t10.body?.edges?.[0],
    },
    durationMs: t10.durationMs,
    pass: t10.status === 200 && nodeLen > 0 && edgeLen > 0,
  });

  // Test 11: GET /cases/{caseId}/findings
  const t11 = await request("GET", `/cases/${testCaseId}/findings`);
  const findingsList = t11.body?.findings || [];
  let t11ReferentialIntegrity = true;
  for (const f of findingsList) {
    for (const nid of f.relatedNodeIds || []) {
      if (!nodeSetA.has(nid)) t11ReferentialIntegrity = false;
    }
  }
  results.push({
    testNum: 11,
    endpoint: `GET /cases/${testCaseId}/findings`,
    expected: "200, non-empty findings, valid relatedNodeIds",
    actualStatus: t11.status,
    responseBody: {
      count: findingsList.length,
      findings: findingsList,
    },
    durationMs: t11.durationMs,
    pass: t11.status === 200 && findingsList.length > 0 && t11ReferentialIntegrity,
  });

  // Test 12: GET /cases/{caseId}/findings?source=basic-risk
  const t12 = await request("GET", `/cases/${testCaseId}/findings?source=basic-risk`);
  results.push({
    testNum: 12,
    endpoint: `GET /cases/${testCaseId}/findings?source=basic-risk`,
    expected: "200, filtered findings",
    actualStatus: t12.status,
    responseBody: t12.body,
    durationMs: t12.durationMs,
    pass: t12.status === 200 && Array.isArray(t12.body?.findings),
  });

  // Test 13: GET /cases/{caseId}/findings?source=invalid-value
  const t13 = await request("GET", `/cases/${testCaseId}/findings?source=invalid-value`);
  results.push({
    testNum: 13,
    endpoint: `GET /cases/${testCaseId}/findings?source=invalid-value`,
    expected: "200 empty findings list OR 400",
    actualStatus: t13.status,
    responseBody: t13.body,
    durationMs: t13.durationMs,
    pass: (t13.status === 200 && t13.body?.findings?.length === 0) || t13.status === 400,
    notes: `Returned HTTP ${t13.status} with findings count ${(t13.body?.findings || []).length}`,
  });

  // Test 14: POST /cases/{caseId}/analyze with {}
  const t14 = await request("POST", `/cases/${testCaseId}/analyze`, { body: {} });
  console.log("Test 14 Triggered Analyze:", t14.status, t14.body);
  const pollAnalyze = await pollCaseStatus(testCaseId, "analyzed", 20000);
  const t14FinalCase = pollAnalyze.finalRes.body?.case || pollAnalyze.finalRes.body;
  results.push({
    testNum: 14,
    endpoint: `POST /cases/${testCaseId}/analyze`,
    expected: "202 Accepted, polls to analyzed",
    actualStatus: t14.status,
    responseBody: {
      initial: t14.body,
      finalStatus: t14FinalCase?.status,
      riskScore: t14FinalCase?.riskScore,
      riskLevel: t14FinalCase?.riskLevel,
      transitions: pollAnalyze.transitions,
    },
    durationMs: t14.durationMs,
    pass: t14.status === 202 && t14FinalCase?.status === "analyzed",
  });

  // Test 15: POST /cases/{caseId}/analyze again immediately with {}
  const t15 = await request("POST", `/cases/${testCaseId}/analyze`, { body: {} });
  results.push({
    testNum: 15,
    endpoint: `POST /cases/${testCaseId}/analyze (idempotent / already analyzed)`,
    expected: "202 / 200 / 409",
    actualStatus: t15.status,
    responseBody: t15.body,
    durationMs: t15.durationMs,
    pass: t15.status === 200 || t15.status === 202 || t15.status === 409,
    notes: `Returned HTTP ${t15.status}`,
  });

  // Test 16: POST /cases/{caseId}/analyze with {"force": true}
  const t16 = await request("POST", `/cases/${testCaseId}/analyze`, { body: { force: true } });
  await pollCaseStatus(testCaseId, "analyzed", 10000);
  results.push({
    testNum: 16,
    endpoint: `POST /cases/${testCaseId}/analyze {"force":true}`,
    expected: "202 / 200 / 409",
    actualStatus: t16.status,
    responseBody: t16.body,
    durationMs: t16.durationMs,
    pass: t16.status === 200 || t16.status === 202 || t16.status === 409,
    notes: `Returned HTTP ${t16.status}`,
  });

  // Test 17: GET /cases/{caseId}/analysis
  const t17 = await request("GET", `/cases/${testCaseId}/analysis`);
  results.push({
    testNum: 17,
    endpoint: `GET /cases/${testCaseId}/analysis`,
    expected: "200, complete analysis result",
    actualStatus: t17.status,
    responseBody: t17.body,
    durationMs: t17.durationMs,
    pass: t17.status === 200 && t17.body?.riskScore !== undefined,
  });

  // Test 18: GET /cases/{caseId}/attribution
  const t18 = await request("GET", `/cases/${testCaseId}/attribution`);
  results.push({
    testNum: 18,
    endpoint: `GET /cases/${testCaseId}/attribution`,
    expected: "200, attribution details or null",
    actualStatus: t18.status,
    responseBody: t18.body,
    durationMs: t18.durationMs,
    pass: t18.status === 200,
  });

  // Test 19: Create NEW case, immediately POST /cases/{newCaseId}/analyze
  const t19Create = await request("POST", "/cases", {
    body: {
      rootAddress: "0xdead000000000000000000000000000000000002",
      chainId: 80002,
      mode: "demo",
    },
  });
  const earlyCaseId = extractCaseId(t19Create.body);
  const t19Analyze = await request("POST", `/cases/${earlyCaseId}/analyze`, { body: {} });
  results.push({
    testNum: 19,
    endpoint: `POST /cases/${earlyCaseId}/analyze (before graph_ready)`,
    expected: "400 or 409 error",
    actualStatus: t19Analyze.status,
    responseBody: t19Analyze.body,
    durationMs: t19Analyze.durationMs,
    pass: t19Analyze.status === 400 || t19Analyze.status === 409,
    notes: `Returned HTTP ${t19Analyze.status} ${JSON.stringify(t19Analyze.body)}`,
  });

  // Test 20: POST /cases/{caseId}/reports with {}
  const t20 = await request("POST", `/cases/${testCaseId}/reports`, { body: {} });
  createdReportId = extractReportId(t20.body);
  results.push({
    testNum: 20,
    endpoint: `POST /cases/${testCaseId}/reports`,
    expected: "201 Created, version 1, sha256Hash",
    actualStatus: t20.status,
    responseBody: t20.body,
    durationMs: t20.durationMs,
    pass: t20.status === 201 && (t20.body?.report?.version === 1 || t20.body?.version === 1) && !!(t20.body?.report?.sha256Hash || t20.body?.sha256Hash),
  });

  // Test 21: POST /cases/{caseId}/reports again (version increments)
  const t21 = await request("POST", `/cases/${testCaseId}/reports`, { body: {} });
  results.push({
    testNum: 21,
    endpoint: `POST /cases/${testCaseId}/reports (second report)`,
    expected: "201 Created, version 2",
    actualStatus: t21.status,
    responseBody: t21.body,
    durationMs: t21.durationMs,
    pass: t21.status === 201 && (t21.body?.report?.version === 2 || t21.body?.version === 2),
  });

  // Test 22: POST /cases/does-not-exist/reports
  const t22 = await request("POST", "/cases/non_existent_case_123/reports", { body: {} });
  results.push({
    testNum: 22,
    endpoint: "POST /cases/non_existent_case_123/reports",
    expected: "404 Not Found",
    actualStatus: t22.status,
    responseBody: t22.body,
    durationMs: t22.durationMs,
    pass: t22.status === 404,
  });

  // Test 23: POST /cases/{caseId}/evidence with {"reportId": createdReportId}
  const t23 = await request("POST", `/cases/${testCaseId}/evidence`, {
    body: { reportId: createdReportId },
  });
  results.push({
    testNum: 23,
    endpoint: `POST /cases/${testCaseId}/evidence`,
    expected: "200 or 201 with evidence record (storage_failed or verified)",
    actualStatus: t23.status,
    responseBody: t23.body,
    durationMs: t23.durationMs,
    pass: t23.status === 200 || t23.status === 201,
  });

  // Test 24: POST /cases/{caseId}/evidence with fake reportId
  const t24 = await request("POST", `/cases/${testCaseId}/evidence`, {
    body: { reportId: "fake_report_id_99999" },
  });
  results.push({
    testNum: 24,
    endpoint: `POST /cases/${testCaseId}/evidence (fake reportId)`,
    expected: "404 Not Found",
    actualStatus: t24.status,
    responseBody: t24.body,
    durationMs: t24.durationMs,
    pass: t24.status === 404,
  });

  // Test 25: POST /evidence/verify with real caseId + reportId
  const t25 = await request("POST", "/evidence/verify", {
    body: { caseId: testCaseId, reportId: createdReportId },
  });
  results.push({
    testNum: 25,
    endpoint: "POST /evidence/verify (valid caseId + reportId)",
    expected: "200 with verified boolean + reason",
    actualStatus: t25.status,
    responseBody: t25.body,
    durationMs: t25.durationMs,
    pass: t25.status === 200 && typeof t25.body?.verified === "boolean",
  });

  // Test 26: POST /evidence/verify with fake caseId
  const t26 = await request("POST", "/evidence/verify", {
    body: { caseId: "fake_case_id_99999", reportId: createdReportId },
  });
  results.push({
    testNum: 26,
    endpoint: "POST /evidence/verify (fake caseId)",
    expected: "404 Not Found",
    actualStatus: t26.status,
    responseBody: t26.body,
    durationMs: t26.durationMs,
    pass: t26.status === 404,
  });

  // Test 27: POST /cases with malformed JSON, then health check
  const t27 = await request("POST", "/cases", {
    rawBody: "{ bad_json: true, ",
    headers: { "Content-Type": "application/json" },
  });
  const t27Health = await request("GET", "/health");
  results.push({
    testNum: 27,
    endpoint: "POST /cases (malformed JSON) + health check",
    expected: "400 Bad Request, server stays alive (200 /health)",
    actualStatus: t27.status,
    responseBody: { malformedResponse: t27.body, healthResponse: t27Health.body },
    durationMs: t27.durationMs,
    pass: t27.status === 400 && t27Health.status === 200,
  });

  // Test 28: POST /cases with valid body but no Content-Type header
  const t28 = await request("POST", "/cases", {
    rawBody: JSON.stringify({
      rootAddress: "0xb09712FeB42F0Ee945180B17EE1f3488F2E7d3F3",
      chainId: 80002,
      mode: "demo",
    }),
    headers: {}, // No Content-Type
  });
  results.push({
    testNum: 28,
    endpoint: "POST /cases (no Content-Type header)",
    expected: "415 Unsupported Media Type or 400",
    actualStatus: t28.status,
    responseBody: t28.body,
    durationMs: t28.durationMs,
    pass: t28.status === 415 || t28.status === 400,
    notes: `Returned HTTP ${t28.status}`,
  });

  console.log("\n==========================================");
  console.log("FULL RESULTS TABLE:");
  console.log("==========================================");
  for (const r of results) {
    console.log(
      `Test ${String(r.testNum).padEnd(2)} | ${r.endpoint.padEnd(50)} | ${String(r.actualStatus).padEnd(3)} | ${r.pass ? "PASS" : "FAIL"} | (${r.durationMs.toFixed(1)}ms)`
    );
  }

  // Save complete JSON artifact for full verbatim output
  fs.writeFileSync(
    "reverify_report.json",
    JSON.stringify(
      {
        partA: {
          caseAId,
          caseBId,
          nodeCountA1,
          edgeCountA1,
          nodeCountB,
          edgeCountB,
          nodeCountA2,
          edgeCountA2,
          sampleNodeIdsA: graphARes1.body?.nodes?.slice(0, 3).map((n: any) => n.id),
          sampleNodeIdsB: graphBRes.body?.nodes?.slice(0, 3).map((n: any) => n.id),
          findingsA: findingsARes.body?.findings,
          findingsB: findingsBRes.body?.findings,
          partAPass,
        },
        partB: results,
      },
      null,
      2
    )
  );
  console.log("\nSaved complete output to reverify_report.json");
}

runVerification().catch(console.error);
