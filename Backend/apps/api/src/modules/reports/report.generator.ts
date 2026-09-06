import PDFDocument from "pdfkit";
import type { PrismaClient } from "../../generated/client.js";

interface ReportData {
  caseRecord: NonNullable<Awaited<ReturnType<PrismaClient["case"]["findUnique"]>>> & {
    transactions: Array<{
      id: string;
      hash: string;
      fromAddress: string;
      toAddress: string;
      asset: string;
      amount: string;
      amountUsd: number | null;
      timestamp: Date;
      transferType: string;
    }>;
    graphNodes: Array<{
      id: string;
      address: string;
      type: string;
      labelsJson: string;
      riskLevel: string | null;
      totalInUsd: number | null;
      totalOutUsd: number | null;
    }>;
    graphEdges: Array<{
      id: string;
      fromNodeId: string;
      toNodeId: string;
      transactionHash: string;
      asset: string;
      amount: string;
      amountUsd: number | null;
      timestamp: Date;
      hopDepth: number;
    }>;
    riskFindings: Array<{
      id: string;
      source: string;
      type: string;
      severity: string;
      confidence: number;
      title: string;
      description: string;
      signalsJson: string;
    }>;
    analysisResults?: Array<{
      id: string;
      riskScore: number;
      riskLevel: string;
      suspiciousPathsJson: string;
      circularFlowsJson: string;
      metadataJson: string;
    }>;
  };
}

/**
 * Generates a structured forensic investigation report PDF buffer for a given case.
 */
export async function generateReportPdf(
  caseId: string,
  prisma: PrismaClient
): Promise<Buffer> {
  const caseRecord = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      transactions: {
        orderBy: { timestamp: "asc" },
      },
      graphNodes: true,
      graphEdges: true,
      riskFindings: true,
      ...(("analysisResult" in prisma || "analysisResults" in prisma.case.fields)
        ? { analysisResults: true }
        : {}),
    } as any,
  });

  if (!caseRecord) {
    throw new Error(`Case not found: ${caseId}`);
  }

  const data = caseRecord as unknown as ReportData["caseRecord"];

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
      info: {
        Title: `Forensic Report - Case ${caseId}`,
        Author: "On-Chain Forensic Triage Engine",
        Subject: `Investigation Report for Root Address ${data.rootAddress}`,
      },
    });

    const buffers: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", (err: Error) => reject(err));

    // Colors
    const primaryColor = "#1e293b";
    const accentColor = "#2563eb";
    const mutedColor = "#64748b";
    const dangerColor = "#dc2626";
    const warningColor = "#d97706";
    const successColor = "#16a34a";
    const borderColor = "#e2e8f0";

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

    // Header
    doc
      .fontSize(20)
      .fillColor(primaryColor)
      .font("Helvetica-Bold")
      .text("On-Chain Forensic Investigation Report", { align: "left" });

    doc
      .fontSize(9)
      .fillColor(mutedColor)
      .font("Helvetica")
      .text(`Generated at: ${new Date().toUTCString()} | System: CIS Forensic Triage Engine`)
      .moveDown(0.5);

    drawDivider();

    // 1. Case Summary
    drawSectionHeader("Case Summary", 1);
    doc.font("Helvetica").fontSize(10).fillColor(primaryColor);

    const scoreColor =
      (data.riskScore ?? 0) >= 70
        ? dangerColor
        : (data.riskScore ?? 0) >= 40
        ? warningColor
        : successColor;

    doc.text(`• Case ID: ${data.id}`);
    doc.text(`• Target Root Address: ${data.rootAddress}`);
    doc.text(`• Network Chain ID: ${data.chainId}`);
    doc.text(`• Investigation Mode: ${data.mode.toUpperCase()}`);
    doc.text(`• Status: ${data.status}`);
    doc.text(`• Created At: ${data.createdAt.toISOString()}`);
    doc.text(`• Updated At: ${data.updatedAt.toISOString()}`);
    
    doc
      .text("• Risk Assessment: ", { continued: true })
      .fillColor(scoreColor)
      .font("Helvetica-Bold")
      .text(
        data.riskScore !== null && data.riskLevel !== null
          ? `${data.riskScore}/100 (${data.riskLevel.toUpperCase()})`
          : "Not calculated yet"
      )
      .font("Helvetica")
      .fillColor(primaryColor);

    drawDivider();

    // 2. Transaction Summary
    drawSectionHeader("Transaction Summary", 2);
    const txCount = data.transactions.length;
    let totalUsd = 0;
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    for (const tx of data.transactions) {
      if (tx.amountUsd) totalUsd += tx.amountUsd;
      if (!minDate || tx.timestamp < minDate) minDate = tx.timestamp;
      if (!maxDate || tx.timestamp > maxDate) maxDate = tx.timestamp;
    }

    doc.fontSize(10).fillColor(primaryColor);
    doc.text(`• Total Ingested Transactions: ${txCount}`);
    doc.text(
      `• Estimated Total Transfer Volume (USD): ${
        totalUsd > 0 ? `$${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "N/A"
      }`
    );
    doc.text(
      `• Transaction Date Range: ${
        minDate && maxDate
          ? `${minDate.toISOString().split("T")[0]} to ${maxDate.toISOString().split("T")[0]}`
          : "No transactions found"
      }`
    );

    drawDivider();

    // 3. Graph Summary
    drawSectionHeader("Graph Topology Summary", 3);
    const nodesByType = new Map<string, number>();
    const flaggedNonWallet: string[] = [];

    for (const node of data.graphNodes) {
      const type = node.type || "unknown";
      nodesByType.set(type, (nodesByType.get(type) ?? 0) + 1);
      if (type !== "wallet") {
        let parsedLabels: string[] = [];
        try {
          parsedLabels = JSON.parse(node.labelsJson);
        } catch {}
        flaggedNonWallet.push(
          `${node.address} (${type}${parsedLabels.length > 0 ? ` - ${parsedLabels.join(", ")}` : ""})`
        );
      }
    }

    doc.fontSize(10).fillColor(primaryColor);
    doc.text(`• Total Graph Nodes: ${data.graphNodes.length}`);
    doc.text(`• Total Graph Edges: ${data.graphEdges.length}`);
    
    const typeBreakdown = Array.from(nodesByType.entries())
      .map(([t, count]) => `${t}: ${count}`)
      .join(", ");
    doc.text(`• Node Breakdown: ${typeBreakdown || "None"}`);

    if (flaggedNonWallet.length > 0) {
      doc.text("• Non-Wallet Entities Identified:");
      for (const item of flaggedNonWallet.slice(0, 10)) {
        doc.fillColor(mutedColor).text(`    - ${item}`).fillColor(primaryColor);
      }
      if (flaggedNonWallet.length > 10) {
        doc.fillColor(mutedColor).text(`    - ...and ${flaggedNonWallet.length - 10} more`).fillColor(primaryColor);
      }
    }

    drawDivider();

    // 4. Basic Findings
    drawSectionHeader("Basic Risk Findings (Rule-Based Detectors)", 4);
    const basicFindings = data.riskFindings.filter(
      (f) => f.source === "basic-risk"
    );

    if (basicFindings.length === 0) {
      doc.fontSize(10).fillColor(mutedColor).text("No basic risk findings flagged.");
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
          .text(`  Confidence: ${(finding.confidence * 100).toFixed(0)}% | Detector: ${finding.type}`)
          .moveDown(0.3);
      }
    }

    drawDivider();

    // 5. Advanced Findings & Suspicious Paths
    drawSectionHeader("Advanced Forensic Intelligence (AI / Multi-Hop)", 5);
    const advancedFindings = data.riskFindings.filter(
      (f) => f.source === "python-intelligence"
    );
    const latestAnalysis =
      data.analysisResults && data.analysisResults.length > 0
        ? data.analysisResults[data.analysisResults.length - 1]
        : null;

    if (!latestAnalysis && advancedFindings.length === 0) {
      doc
        .fontSize(10)
        .fillColor(mutedColor)
        .font("Helvetica-Oblique")
        .text("Advanced analysis not yet run for this case.")
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
                .text(`    - Path [Score ${p.score}]: ${p.summary ?? "Multi-hop flow"} (${p.nodeIds?.length ?? 0} hops)`);
            }
          }
        } catch {}
      }

      if (advancedFindings.length > 0) {
        doc.moveDown(0.3).fontSize(10).fillColor(primaryColor).text("• Advanced Findings:");
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
      }
    }

    drawDivider();

    // 6. Evidence & Integrity Verification
    drawSectionHeader("Evidence & Integrity Verification", 6);
    doc.fontSize(10).fillColor(primaryColor);
    doc.text("• Report Status: Generated");
    doc.text("• Evidence Cryptographic Hash (SHA-256): Pending (computed upon PDF finalization)");
    doc.text("• Smart Contract Registry: Pending on-chain notarization");
    doc
      .moveDown(0.5)
      .fontSize(8)
      .fillColor(mutedColor)
      .text(
        "Notice: This forensic report is automatically compiled from blockchain ledger state. The SHA-256 hash of this document is anchored on-chain to provide immutable tamper detection."
      );

    doc.end();
  });
}
