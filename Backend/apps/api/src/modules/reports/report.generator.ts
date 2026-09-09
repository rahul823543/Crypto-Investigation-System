import PDFDocument from "pdfkit";
import type { PrismaClient } from "../../generated/client.js";

/**
 * Generates a structured forensic investigation report PDF buffer for a given case.
 * Works correctly for cases in any status — including graph_ready (no analysis yet).
 * Does NOT assume AnalysisResult exists.
 */
export async function generateReportPdf(
  caseId: string,
  prisma: PrismaClient
): Promise<Buffer> {
  console.log(`[pdf:generate] caseId=${caseId} timestamp=${new Date().toISOString()} stage=start`);

  // Load core case data (always present)
  const caseRecord = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      transactions: {
        orderBy: { timestamp: "asc" },
      },
      graphNodes: true,
      graphEdges: true,
      riskFindings: true,
    },
  });

  if (!caseRecord) {
    console.error(`[pdf:generate] caseId=${caseId} stage=case_fetch status=not_found`);
    throw new Error(`Case not found: ${caseId}`);
  }

  console.log(
    `[pdf:generate] caseId=${caseId} stage=case_fetch status=ok` +
    ` txCount=${caseRecord.transactions.length}` +
    ` nodes=${caseRecord.graphNodes.length}` +
    ` edges=${caseRecord.graphEdges.length}` +
    ` findings=${caseRecord.riskFindings.length}`
  );

  // Optionally load AnalysisResult if the model exists and data is present.
  // This is a separate query so a missing AnalysisResult never crashes the PDF.
  let latestAnalysis: {
    id: string;
    riskScore: number;
    riskLevel: string;
    suspiciousPathsJson: string;
    circularFlowsJson: string;
    attributedVaspJson: string | null;
    metadataJson: string;
  } | null = null;

  try {
    const result = await prisma.analysisResult.findFirst({
      where: { caseId },
      orderBy: { createdAt: "desc" as const },
    });
    latestAnalysis = result ?? null;
    console.log(
      `[pdf:generate] caseId=${caseId} stage=analysis_fetch status=${
        latestAnalysis ? "found" : "not_found"
      }`
    );
  } catch (err) {
    // Model not yet populated or query error — continue without analysis
    console.warn(
      `[pdf:generate] caseId=${caseId} stage=analysis_fetch status=error err=${err instanceof Error ? err.message : String(err)}`
    );
    latestAnalysis = null;
  }

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
      info: {
        Title: `Forensic Report - Case ${caseId}`,
        Author: "On-Chain Forensic Triage Engine",
        Subject: `Investigation Report for Root Address ${caseRecord.rootAddress}`,
      },
    });

    const buffers: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", (err: Error) => reject(err));

    // ─── Color Palette ────────────────────────────────────────────────────────
    const primaryColor = "#1e293b";
    const accentColor = "#2563eb";
    const mutedColor = "#64748b";
    const dangerColor = "#dc2626";
    const warningColor = "#d97706";
    const successColor = "#16a34a";
    const borderColor = "#e2e8f0";
    const mixerColor = "#7c3aed"; // purple for mixer dead-ends

    const drawDivider = () => {
      doc
        .moveDown(0.5)
        .strokeColor(borderColor)
        .lineWidth(1)
        .moveTo(40, doc.y)
        .lineTo(555, doc.y)
        .stroke()
        .moveDown(0.8);
    };

    const drawSectionHeader = (title: string, stepNumber: number) => {
      doc
        .fontSize(13)
        .fillColor(accentColor)
        .font("Helvetica-Bold")
        .text(`${stepNumber}. ${title}`)
        .moveDown(0.3);
    };

    // ─── Cover Header ─────────────────────────────────────────────────────────
    doc
      .fontSize(20)
      .fillColor(primaryColor)
      .font("Helvetica-Bold")
      .text("On-Chain Forensic Investigation Report", { align: "left" });

    doc
      .fontSize(9)
      .fillColor(mutedColor)
      .font("Helvetica")
      .text(
        `Generated at: ${new Date().toUTCString()} | System: CIS Forensic Triage Engine`
      )
      .moveDown(0.5);

    drawDivider();

    // ─── 1. Case Summary ──────────────────────────────────────────────────────
    drawSectionHeader("Case Summary", 1);
    doc.font("Helvetica").fontSize(10).fillColor(primaryColor);

    const scoreColor =
      (caseRecord.riskScore ?? 0) >= 70
        ? dangerColor
        : (caseRecord.riskScore ?? 0) >= 40
        ? warningColor
        : successColor;

    doc.text(`• Case ID: ${caseRecord.id}`);
    doc.text(`• Target Root Address: ${caseRecord.rootAddress}`);
    doc.text(`• Network Chain ID: ${caseRecord.chainId}`);
    doc.text(`• Investigation Mode: ${caseRecord.mode.toUpperCase()}`);
    doc.text(`• Status: ${caseRecord.status}`);
    doc.text(`• Created At: ${caseRecord.createdAt ? new Date(caseRecord.createdAt).toISOString() : new Date().toISOString()}`);
    doc.text(`• Updated At: ${caseRecord.updatedAt ? new Date(caseRecord.updatedAt).toISOString() : new Date().toISOString()}`);

    doc
      .text("• Risk Assessment: ", { continued: true })
      .fillColor(scoreColor)
      .font("Helvetica-Bold")
      .text(
        caseRecord.riskScore !== null && caseRecord.riskLevel !== null
          ? `${caseRecord.riskScore}/100 (${caseRecord.riskLevel.toUpperCase()})`
          : "Not calculated yet"
      )
      .font("Helvetica")
      .fillColor(primaryColor);

    drawDivider();

    // ─── 2. Transaction Summary ───────────────────────────────────────────────
    drawSectionHeader("Transaction Summary", 2);
    const txCount = caseRecord.transactions.length;
    let totalUsd = 0;
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    for (const tx of caseRecord.transactions) {
      if (tx.amountUsd) totalUsd += tx.amountUsd;
      if (!minDate || tx.timestamp < minDate) minDate = tx.timestamp;
      if (!maxDate || tx.timestamp > maxDate) maxDate = tx.timestamp;
    }

    doc.fontSize(10).fillColor(primaryColor);
    doc.text(`• Total Ingested Transactions: ${txCount}`);
    doc.text(
      `• Estimated Total Transfer Volume (USD): ${
        totalUsd > 0
          ? `$${totalUsd.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          : "N/A"
      }`
    );
    doc.text(
      `• Transaction Date Range: ${
        minDate && maxDate
          ? `${minDate.toISOString().split("T")[0]} to ${
              maxDate.toISOString().split("T")[0]
            }`
          : "No transactions found"
      }`
    );

    drawDivider();

    // ─── 3. Graph Topology Summary ────────────────────────────────────────────
    drawSectionHeader("Graph Topology Summary", 3);
    const nodesByType = new Map<string, number>();
    const flaggedNonWallet: string[] = [];
    const deadEndNodes: string[] = [];

    for (const node of caseRecord.graphNodes) {
      const type = node.type || "unknown";
      nodesByType.set(type, (nodesByType.get(type) ?? 0) + 1);

      let parsedLabels: string[] = [];
      try {
        parsedLabels = JSON.parse(node.labelsJson);
      } catch {}

      if (type !== "wallet") {
        flaggedNonWallet.push(
          `${node.address} (${type}${
            parsedLabels.length > 0 ? ` — ${parsedLabels.join(", ")}` : ""
          })`
        );
      }

      // Collect mixer dead-ends for Section 4b
      if (
        node.isTraceableDeadEnd &&
        (type === "mixer" || parsedLabels.includes("mixer"))
      ) {
        deadEndNodes.push(
          `${node.address} (${parsedLabels.join(", ") || type})`
        );
      }
    }

    doc.fontSize(10).fillColor(primaryColor);
    doc.text(`• Total Graph Nodes: ${caseRecord.graphNodes.length}`);
    doc.text(`• Total Graph Edges: ${caseRecord.graphEdges.length}`);

    const typeBreakdown = Array.from(nodesByType.entries())
      .map(([t, count]) => `${t}: ${count}`)
      .join(", ");
    doc.text(`• Node Breakdown: ${typeBreakdown || "None"}`);

    if (flaggedNonWallet.length > 0) {
      doc.text("• Non-Wallet Entities Identified:");
      for (const item of flaggedNonWallet.slice(0, 10)) {
        doc.fillColor(mutedColor).text(`    – ${item}`).fillColor(primaryColor);
      }
      if (flaggedNonWallet.length > 10) {
        doc
          .fillColor(mutedColor)
          .text(`    – ...and ${flaggedNonWallet.length - 10} more`)
          .fillColor(primaryColor);
      }
    }

    drawDivider();

    // ─── 4a. Basic Risk Findings ──────────────────────────────────────────────
    drawSectionHeader("Basic Risk Findings (Rule-Based Detectors)", 4);
    const basicFindings = caseRecord.riskFindings.filter(
      (f) => f.source === "basic-risk"
    );

    if (basicFindings.length === 0) {
      doc
        .fontSize(10)
        .fillColor(mutedColor)
        .text("No basic risk findings flagged.");
    } else {
      for (const finding of basicFindings) {
        const sevColor =
          finding.severity === "critical" || finding.severity === "high"
            ? dangerColor
            : finding.severity === "medium"
            ? warningColor
            : successColor;

        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor(sevColor)
          .text(`[${finding.severity.toUpperCase()}] `, { continued: true })
          .fillColor(primaryColor)
          .text(finding.title);

        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor(mutedColor)
          .text(`  Description: ${finding.description}`)
          .text(
            `  Confidence: ${(finding.confidence * 100).toFixed(0)}% | Detector: ${finding.type}`
          )
          .moveDown(0.3);
      }
    }

    // ─── 4b. Mixer Dead-End Explanations ─────────────────────────────────────
    if (deadEndNodes.length > 0) {
      doc
        .moveDown(0.3)
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(mixerColor)
        .text("Mixer / Tumbler Dead-End Trail Notice:")
        .font("Helvetica")
        .fillColor(primaryColor)
        .fontSize(9);

      for (const node of deadEndNodes) {
        doc
          .fillColor(mixerColor)
          .text(
            `  ⚠  Trail ends here — funds routed through a known mixer: ${node}`
          )
          .fillColor(mutedColor)
          .text(
            "     Further tracing requires off-chain intelligence or legal process."
          )
          .fillColor(primaryColor)
          .moveDown(0.2);
      }
    }

    drawDivider();

    // ─── 5. Advanced Findings & Suspicious Paths ─────────────────────────────
    drawSectionHeader("Advanced Forensic Intelligence (AI / Multi-Hop)", 5);
    const advancedFindings = caseRecord.riskFindings.filter(
      (f) => f.source === "python-intelligence"
    );

    if (!latestAnalysis && advancedFindings.length === 0) {
      doc
        .fontSize(10)
        .fillColor(mutedColor)
        .font("Helvetica-Oblique")
        .text(
          "Advanced analysis not yet run for this case. Run POST /cases/:caseId/analyze to trigger intelligence analysis."
        )
        .font("Helvetica")
        .fillColor(primaryColor);
    } else {
      if (latestAnalysis) {
        doc
          .fontSize(10)
          .fillColor(primaryColor)
          .text(
            `• Intelligence Assessment: Score ${latestAnalysis.riskScore}/100 (${latestAnalysis.riskLevel.toUpperCase()})`
          );

        try {
          const paths = JSON.parse(latestAnalysis.suspiciousPathsJson);
          if (Array.isArray(paths) && paths.length > 0) {
            doc.text(`• Identified Suspicious Paths (${paths.length}):`);
            for (const p of paths.slice(0, 5)) {
              doc
                .fontSize(9)
                .fillColor(mutedColor)
                .text(
                  `    – Path [Score ${p.score ?? "N/A"}]: ${p.summary ?? "Multi-hop flow"} (${p.nodeIds?.length ?? 0} hops)`
                );
            }
            doc.fillColor(primaryColor);
          }
        } catch {}

        try {
          const flows = JSON.parse(latestAnalysis.circularFlowsJson);
          if (Array.isArray(flows) && flows.length > 0) {
            doc
              .fontSize(10)
              .fillColor(primaryColor)
              .text(`• Circular Flow Patterns Detected: ${flows.length}`);
          }
        } catch {}
      }

      if (advancedFindings.length > 0) {
        doc
          .moveDown(0.3)
          .fontSize(10)
          .fillColor(primaryColor)
          .text("• Advanced Findings:");
        for (const finding of advancedFindings) {
          doc
            .font("Helvetica-Bold")
            .fontSize(9)
            .fillColor(dangerColor)
            .text(`  [${finding.severity.toUpperCase()}] `, { continued: true })
            .fillColor(primaryColor)
            .text(finding.title);

          doc
            .font("Helvetica")
            .fontSize(9)
            .fillColor(mutedColor)
            .text(`    ${finding.description}`)
            .moveDown(0.2);
        }
        doc.fillColor(primaryColor);
      }
    }

    drawDivider();

    // ─── 6. VASP Attribution Result ───────────────────────────────────────────
    drawSectionHeader("Nearest-VASP Attribution", 6);

    if (!latestAnalysis) {
      doc
        .fontSize(10)
        .fillColor(mutedColor)
        .font("Helvetica-Oblique")
        .text("Attribution not available — analysis has not been run yet.")
        .font("Helvetica")
        .fillColor(primaryColor);
    } else {
      let attribution: {
        attributedVasp?: string;
        confidence?: number;
        hopDistance?: number;
        basis?: string;
      } | null = null;

      try {
        attribution = latestAnalysis.attributedVaspJson
          ? JSON.parse(latestAnalysis.attributedVaspJson)
          : null;
      } catch {}

      if (!attribution) {
        doc
          .fontSize(10)
          .fillColor(warningColor)
          .font("Helvetica-Bold")
          .text("No confident VASP match found.")
          .font("Helvetica")
          .fillColor(mutedColor)
          .text(
            "The intelligence engine could not attribute funds to a known VASP with sufficient confidence."
          )
          .fillColor(primaryColor);
      } else {
        doc.fontSize(10).fillColor(primaryColor);
        doc
          .font("Helvetica-Bold")
          .text(`• Attributed VASP: `, { continued: true })
          .fillColor(accentColor)
          .text(attribution.attributedVasp ?? "Unknown")
          .fillColor(primaryColor)
          .font("Helvetica");
        doc.text(
          `• Confidence: ${attribution.confidence !== undefined ? `${(attribution.confidence * 100).toFixed(0)}%` : "N/A"}`
        );
        doc.text(
          `• Hop Distance: ${attribution.hopDistance !== undefined ? attribution.hopDistance : "N/A"} hop(s)`
        );
        doc.text(`• Basis: ${attribution.basis ?? "N/A"}`);
      }
    }

    drawDivider();

    // ─── 7. Evidence & Integrity Verification ────────────────────────────────
    drawSectionHeader("Evidence & Integrity Verification", 7);
    doc.fontSize(10).fillColor(primaryColor);
    doc.text("• Report Status: Generated");
    doc.text(
      "• Evidence Cryptographic Hash (SHA-256): Hash: pending — computed upon PDF finalization and stored in Report record"
    );
    doc.text("• Smart Contract Registry: Pending on-chain notarization");
    doc
      .moveDown(0.5)
      .fontSize(8)
      .fillColor(mutedColor)
      .text(
        "Notice: This forensic report is automatically compiled from blockchain ledger state. " +
          "The SHA-256 hash of this document is anchored on-chain via an EvidenceRegistry smart contract " +
          "to provide immutable tamper detection. The hash recorded in the Report row corresponds exactly " +
          "to the bytes of this PDF file."
      );

    console.log(`[pdf:generate] caseId=${caseId} stage=doc_end status=ok timestamp=${new Date().toISOString()}`);
    doc.end();
  });
}
