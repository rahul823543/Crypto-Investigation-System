import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  FileText,
  ShieldCheck,
  Download,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { caseRepository } from '@/api';
import { useRunAnalysis } from '@/hooks/useAnalysis';
import { useCaseReports, downloadReportFile } from '@/hooks/useReports';

export interface CaseActionBarProps {
  caseId: string;
  onAnalysisTriggered?: () => void;
  isAnalysisRunning?: boolean;
  analysisError?: string | null;
  className?: string;
}

export const CaseActionBar: React.FC<CaseActionBarProps> = ({
  caseId,
  onAnalysisTriggered,
  isAnalysisRunning = false,
  analysisError = null,
  className = '',
}) => {
  const [generatingReport, setGeneratingReport] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const navigate = useNavigate();

  const {
    data: reports = [],
    isLoading: reportsLoading,
    refetch: refetchReports,
  } = useCaseReports(caseId);

  // Latest generated report for this case
  const latestReport = reports && reports.length > 0 ? reports[0] : null;
  const isReportGenerating = generatingReport || latestReport?.status === 'generating';
  const isReportReady = Boolean(
    latestReport && (latestReport.status === 'ready' || latestReport.status === 'generated')
  );
  const isReportFailed = Boolean(
    reportError || latestReport?.status === 'failed'
  );

  const runAnalysisMutation = useRunAnalysis(caseId);

  const handleRunAnalysis = () => {
    runAnalysisMutation.mutate(undefined, {
      onSuccess: () => {
        if (onAnalysisTriggered) onAnalysisTriggered();
      },
    });
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    setReportError(null);
    try {
      await caseRepository.generateReport(caseId);
      await refetchReports();
    } catch (err) {
      setReportError(
        err instanceof Error
          ? err.message
          : 'Report generation failed. Please retry.'
      );
    } finally {
      setGeneratingReport(false);
    }
  };

  /**
   * Triggers browser download of the generated PDF report:
   * GET /cases/:caseId/reports/:reportId/file
   * Content-Type: application/pdf with SHA-256 header validation
   */
  const handleDownloadReport = async () => {
    if (!latestReport) return;
    const reportId = latestReport.reportId || latestReport.id;
    if (!reportId) {
      setReportError('No valid report identifier found');
      return;
    }

    setDownloadingReport(true);
    setReportError(null);
    try {
      const fileName = `case-${caseId}-v${latestReport.version || 1}.pdf`;
      await downloadReportFile(caseId, reportId, fileName);
    } catch (err) {
      setReportError(
        err instanceof Error
          ? err.message
          : 'Failed to download report PDF from server'
      );
    } finally {
      setDownloadingReport(false);
    }
  };

  const handleExportJson = async () => {
    const caseData = await caseRepository.getCase(caseId);
    const graphData = await caseRepository.getGraph(caseId);
    const findingsData = await caseRepository.getFindings(caseId);
    const analysisData = await caseRepository.getAnalysis(caseId);
    const attributionData = await caseRepository.getAttribution(caseId);

    const fullExport = {
      case: caseData,
      graph: graphData,
      findings: findingsData,
      analysis: analysisData,
      attribution: attributionData,
      exportedAt: new Date().toISOString(),
    };

    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(fullExport, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${caseId}_forensic_export.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div
      className={`p-5 rounded-3xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-wrap items-center justify-between gap-4 ${className}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#94A3B8]">
          Investigation Actions
        </span>
        {isReportReady && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] font-mono font-semibold">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            PDF v{latestReport?.version || 1} Ready
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Re-Analyze Topology */}
        <Button
          size="sm"
          variant="outline"
          onClick={handleRunAnalysis}
          isLoading={runAnalysisMutation.isPending || isAnalysisRunning}
          leftIcon={<Zap className="h-4 w-4 text-[#7E22CE]" />}
        >
          {runAnalysisMutation.isPending || isAnalysisRunning
            ? 'Analyzing Graph...'
            : 'Re-Analyze Topology'}
        </Button>

        {/* Generate / Regenerate PDF Dossier */}
        <Button
          size="sm"
          variant="outline"
          onClick={handleGenerateReport}
          isLoading={isReportGenerating}
          leftIcon={
            isReportReady ? (
              <RotateCw className="h-4 w-4 text-indigo-600" />
            ) : (
              <FileText className="h-4 w-4 text-[#4F46E5]" />
            )
          }
        >
          {isReportGenerating
            ? 'Generating Dossier...'
            : isReportReady
            ? 'Regenerate PDF'
            : 'Generate PDF Dossier'}
        </Button>

        {/* 1. DOWNLOAD REPORT BUTTON */}
        <Button
          size="sm"
          variant={isReportReady ? 'primary' : 'outline'}
          onClick={handleDownloadReport}
          disabled={!isReportReady || isReportGenerating || downloadingReport}
          isLoading={downloadingReport}
          leftIcon={<Download className="h-4 w-4" />}
          className={
            isReportFailed
              ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
              : !isReportReady
              ? 'opacity-60 cursor-not-allowed text-slate-400 bg-slate-50 border-slate-200'
              : 'shadow-sm'
          }
          title={
            isReportFailed
              ? 'Report generation failed. Click Regenerate PDF above.'
              : !latestReport
              ? 'Report has not been generated yet. Click "Generate PDF Dossier" first.'
              : isReportGenerating
              ? 'PDF report is currently generating...'
              : `Download forensic PDF report (v${latestReport?.version || 1}) via GET /cases/${caseId}/reports/${latestReport?.reportId || latestReport?.id}/file`
          }
        >
          {downloadingReport
            ? 'Downloading PDF...'
            : isReportGenerating
            ? 'Generating PDF...'
            : isReportFailed
            ? 'Report Failed'
            : isReportReady && latestReport
            ? `Download Report (v${latestReport.version || 1})`
            : reportsLoading
            ? 'Checking Reports...'
            : 'Download Report'}
        </Button>

        {/* Verify Proof */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/evidence?caseId=${caseId}`)}
          leftIcon={<ShieldCheck className="h-4 w-4 text-[#10B981]" />}
        >
          Verify Proof
        </Button>

        {/* Export JSON */}
        <Button
          size="sm"
          variant="outline"
          onClick={handleExportJson}
          leftIcon={<Download className="h-4 w-4 text-slate-500" />}
        >
          Export Case JSON
        </Button>
      </div>

      {/* Clear error state if report generation or download failed */}
      {isReportFailed && (
        <div className="w-full mt-2 p-3 rounded-2xl bg-red-50/80 border border-red-200/80 flex items-center justify-between gap-3 text-xs text-red-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            <span>
              <strong>Report Error:</strong>{' '}
              {reportError || 'Dossier compilation failed. Check backend logs or try regenerating.'}
            </span>
          </div>
          <button
            onClick={handleGenerateReport}
            className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors text-xs shrink-0 cursor-pointer"
          >
            Retry Generation
          </button>
        </div>
      )}

      {analysisError && (
        <p className="w-full text-xs text-red-600 font-mono mt-1 pl-1">
          ⚠ Analysis failed: {analysisError}
        </p>
      )}
    </div>
  );
};

