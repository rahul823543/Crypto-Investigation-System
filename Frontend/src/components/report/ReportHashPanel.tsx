import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  Clock,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  FileCode,
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useCaseReports, useGenerateReport, downloadReportFile } from '@/hooks/useReports';
import { useNavigate } from 'react-router-dom';
import type { ReportMetadata } from '@/types';

export interface ReportHashPanelProps {
  caseId: string;
  onSelectReportForVerification?: (reportId: string) => void;
  className?: string;
}

export const ReportHashPanel: React.FC<ReportHashPanelProps> = ({
  caseId,
  onSelectReportForVerification,
  className = '',
}) => {
  const navigate = useNavigate();
  const { data: reports = [], isLoading, isError, refetch } = useCaseReports(caseId);
  const generateMutation = useGenerateReport();

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  // Active report (either user-selected or latest version)
  const activeReport = React.useMemo(() => {
    if (!reports || reports.length === 0) return null;
    if (selectedReportId) {
      const found = reports.find((r) => r.reportId === selectedReportId || r.id === selectedReportId);
      if (found) return found;
    }
    return reports[0];
  }, [reports, selectedReportId]);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleGenerate = () => {
    generateMutation.mutate(caseId, {
      onSuccess: (newReport) => {
        setSelectedReportId(newReport.reportId);
      },
    });
  };

  const handleVerifyReport = (report: ReportMetadata) => {
    if (onSelectReportForVerification) {
      onSelectReportForVerification(report.reportId);
    } else {
      navigate(`/evidence?caseId=${caseId}&reportId=${report.reportId}`);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Quick Generate Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-slate-900">
              Forensic Report & Tamper-Evident Hashing
            </h3>
            <p className="text-xs text-slate-500">
              Deterministic PDF dossiers stamped with SHA-256 cryptographic hashes for court admissibility.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={handleGenerate}
          isLoading={generateMutation.isPending}
          leftIcon={<RotateCw className="h-4 w-4" />}
          className="self-start sm:self-auto shrink-0 shadow-sm"
        >
          {generateMutation.isPending ? 'Compiling Dossier...' : 'Generate Forensic PDF'}
        </Button>
      </div>

      {/* Generation Feedback Alerts */}
      {generateMutation.isError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs text-red-800 flex-1">
            <span className="font-bold block mb-0.5">Report Generation Error</span>
            {generateMutation.error?.message || 'Failed to compile forensic report. Verify case state and try again.'}
          </div>
        </div>
      )}

      {generateMutation.isSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>
              Forensic report generated successfully. Version <strong>v{generateMutation.data.version || 1}</strong> is ready.
            </span>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-xs font-mono text-slate-500">Loading case report history...</p>
        </div>
      ) : isError ? (
        <div className="p-8 text-center bg-red-50/50 rounded-3xl border border-red-200">
          <ShieldAlert className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-red-900">Failed to load reports</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3">
            Retry
          </Button>
        </div>
      ) : !activeReport ? (
        /* Empty State */
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 border border-slate-200 flex items-center justify-center mx-auto">
            <FileCode className="h-7 w-7" />
          </div>
          <div>
            <h4 className="font-display font-bold text-base text-slate-800">
              No Reports Generated Yet
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Generate the initial forensic report to compute its SHA-256 fingerprint, capture the graph state, and prepare for on-chain attestation.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={handleGenerate}
            isLoading={generateMutation.isPending}
            leftIcon={<FileText className="h-4 w-4" />}
          >
            Generate Initial Report
          </Button>
        </div>
      ) : (
        /* Active Report Hash Display */
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 font-mono text-xs font-bold border border-indigo-500/30">
                  Version #{activeReport.version || 1}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/30">
                  Status: {activeReport.status.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <Clock className="h-3.5 w-3.5" />
                <span>Generated: {new Date(activeReport.generatedAt).toLocaleString()}</span>
              </div>
            </div>

            {/* Cryptographic Hash Showcase */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-slate-400">
                  Canonical SHA-256 Hash Digest
                </span>
                <span className="text-[10px] font-mono text-indigo-400">
                  256-bit Document Hash
                </span>
              </div>

              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <code className="font-mono text-xs text-indigo-300 break-all select-all font-semibold">
                  {activeReport.computedHash || activeReport.sha256Hash}
                </code>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleCopyHash(activeReport.computedHash || activeReport.sha256Hash || '')
                    }
                    className="bg-slate-800/80 hover:bg-slate-700 text-white border-slate-700 text-xs"
                    leftIcon={
                      copiedHash ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )
                    }
                  >
                    {copiedHash ? 'Copied Hash' : 'Copy Hash'}
                  </Button>

                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() =>
                      downloadReportFile(
                        caseId,
                        activeReport.reportId || activeReport.id || '',
                        `case-${caseId}-v${activeReport.version || 1}.pdf`
                      )
                    }
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs shadow-sm"
                    leftIcon={<Download className="h-3.5 w-3.5" />}
                  >
                    Download PDF
                  </Button>
                </div>
              </div>
            </div>

            {/* Metadata Summary & Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <span className="text-[10px] text-slate-400 uppercase block mb-1">Report Identifier</span>
                <span className="text-slate-200 font-bold break-all">{activeReport.reportId}</span>
              </div>

              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <span className="text-[10px] text-slate-400 uppercase block mb-1">File Storage Path</span>
                <span className="text-slate-200 font-bold truncate block">{activeReport.filePath || `storage/reports/${caseId}.pdf`}</span>
              </div>

              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block mb-1">On-Chain Evidence</span>
                  <span className="text-emerald-400 font-bold">Ready to Notarize</span>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleVerifyReport(activeReport)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                  rightIcon={<ShieldCheck className="h-3.5 w-3.5" />}
                >
                  Verify
                </Button>
              </div>
            </div>
          </div>

          {/* Historical Report Versions Table */}
          {reports.length > 1 && (
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4">
              <h4 className="font-display font-bold text-sm text-slate-900">
                Historical Dossier Versions ({reports.length})
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
                      <th className="py-2.5 px-3">Version</th>
                      <th className="py-2.5 px-3">Report ID</th>
                      <th className="py-2.5 px-3">SHA-256 Digest</th>
                      <th className="py-2.5 px-3">Created</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reports.map((r) => {
                      const isCurrent = (r.reportId === activeReport.reportId) || (r.id === activeReport.id);
                      return (
                        <tr
                          key={r.reportId || r.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            isCurrent ? 'bg-indigo-50/40 font-semibold' : ''
                          }`}
                        >
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-bold">
                              v{r.version || 1}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-700">{r.reportId}</td>
                          <td className="py-3 px-3 text-indigo-600 truncate max-w-[200px]">
                            {r.computedHash || r.sha256Hash}
                          </td>
                          <td className="py-3 px-3 text-slate-500">
                            {new Date(r.generatedAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() =>
                                downloadReportFile(
                                  caseId,
                                  r.reportId || r.id || '',
                                  `case-${caseId}-v${r.version || 1}.pdf`
                                )
                              }
                              className="text-slate-600 hover:text-slate-900 font-semibold cursor-pointer underline mr-2"
                              title="Download PDF file"
                            >
                              Download
                            </button>
                            <button
                              onClick={() => setSelectedReportId(r.reportId)}
                              className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline mr-2"
                            >
                              Inspect
                            </button>
                            <button
                              onClick={() => handleVerifyReport(r)}
                              className="text-emerald-600 hover:text-emerald-800 font-semibold cursor-pointer underline"
                            >
                              Verify
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
