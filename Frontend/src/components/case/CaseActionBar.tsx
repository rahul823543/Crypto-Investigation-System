import React from 'react';
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
import { useTriggerAnalysis } from '@/hooks/useCaseAnalysis';
import { useGenerateReport } from '@/hooks/useReports';

export interface CaseActionBarProps {
  caseId: string;
  onTabChange?: (tab: string) => void;
  className?: string;
}

export const CaseActionBar: React.FC<CaseActionBarProps> = ({
  caseId,
  onTabChange,
  className = '',
}) => {
  const navigate = useNavigate();
  const triggerAnalysisMutation = useTriggerAnalysis();
  const generateReportMutation = useGenerateReport();

  const handleRunAnalysis = () => {
    triggerAnalysisMutation.mutate(caseId, {
      onSuccess: () => {
        if (onTabChange) onTabChange('paths');
      },
    });
  };

  const handleGenerateReport = () => {
    generateReportMutation.mutate(caseId, {
      onSuccess: () => {
        if (onTabChange) onTabChange('reports');
      },
    });
  };

  const handleExportJson = async () => {
    const caseData = await caseRepository.getCase(caseId);
    const graphData = await caseRepository.getGraph(caseId);
    const findingsData = await caseRepository.getFindings(caseId);
    const analysisData = await caseRepository.getAnalysis(caseId);

    const fullExport = {
      case: caseData,
      graph: graphData,
      findings: findingsData,
      analysis: analysisData,
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
          isLoading={triggerAnalysisMutation.isPending}
          leftIcon={<Zap className="h-4 w-4 text-[#7E22CE]" />}
        >
          {triggerAnalysisMutation.isPending ? 'Analyzing Graph...' : 'Re-Analyze Topology'}
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleGenerateReport}
          isLoading={generateReportMutation.isPending}
          leftIcon={
            generateReportMutation.isSuccess ? (
              <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
            ) : (
              <FileText className="h-4 w-4 text-[#4F46E5]" />
            )
          }
        >
          {generateReportMutation.isPending
            ? 'Generating Dossier...'
            : generateReportMutation.isSuccess
            ? 'Report Ready'
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
    </div>
  );
};
