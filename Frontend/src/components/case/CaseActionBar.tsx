import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  FileText,
  ShieldCheck,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { caseRepository } from '@/api';
import { useRunAnalysis } from '@/hooks/useAnalysis';

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
  const [reportReady, setReportReady] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const navigate = useNavigate();

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
      setReportReady(true);
    } catch (err) {
      setReportError(
        err instanceof Error
          ? err.message
          : 'Report generation failed. Please retry.'
      );
      setReportReady(false);
    } finally {
      setGeneratingReport(false);
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
      </div>

      <div className="flex flex-wrap items-center gap-3">
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

        <Button
          size="sm"
          variant="outline"
          onClick={handleGenerateReport}
          isLoading={generatingReport}
          leftIcon={
            reportReady ? (
              <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
            ) : (
              <FileText className="h-4 w-4 text-[#4F46E5]" />
            )
          }
        >
          {generatingReport
            ? 'Generating Dossier...'
            : reportReady
            ? 'Report Ready (Regenerate)'
            : 'Generate PDF Dossier'}
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/evidence?caseId=${caseId}`)}
          leftIcon={<ShieldCheck className="h-4 w-4 text-[#10B981]" />}
        >
          Verify Proof
        </Button>

        <Button
          size="sm"
          variant="primary"
          onClick={handleExportJson}
          leftIcon={<Download className="h-4 w-4" />}
          className="shadow-sm"
        >
          Export Case JSON
        </Button>
      </div>

      {/* Error feedback for report generation failure */}
      {reportError && (
        <p className="w-full text-xs text-red-600 font-mono mt-1 pl-1">
          ⚠ {reportError}
        </p>
      )}
      {analysisError && (
        <p className="w-full text-xs text-red-600 font-mono mt-1 pl-1">
          ⚠ Analysis failed: {analysisError}
        </p>
      )}
    </div>
  );
};
