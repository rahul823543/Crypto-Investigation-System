import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileCheck2,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  FileQuestion,
  RotateCw,
  Copy,
  Check,
  AlertOctagon,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useVerifyEvidence } from '@/hooks/useEvidence';
import type { EvidenceVerificationResult } from '@/types';

export const EvidenceVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialCaseId = searchParams.get('caseId') || 'case_001';
  const initialReportId = searchParams.get('reportId') || 'report_001';

  const [caseIdInput, setCaseIdInput] = useState(initialCaseId);
  const [reportIdInput, setReportIdInput] = useState(initialReportId);
  const [result, setResult] = useState<EvidenceVerificationResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const verifyMutation = useVerifyEvidence();

  // Auto-verify if query params were passed from another page
  useEffect(() => {
    const qCase = searchParams.get('caseId');
    const qReport = searchParams.get('reportId');
    if (qCase && qReport) {
      verifyMutation.mutate(
        {
          caseId: qCase,
          reportId: qReport,
        },
        {
          onSuccess: (data) => setResult(data),
        }
      );
    }
  }, [searchParams, verifyMutation]);

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!caseIdInput.trim()) return;

    verifyMutation.mutate(
      {
        caseId: caseIdInput.trim(),
        reportId: reportIdInput.trim() || 'report_001',
      },
      {
        onSuccess: (data) => setResult(data),
      }
    );
  };

  const handleQuickScenario = (caseId: string, reportId: string) => {
    setCaseIdInput(caseId);
    setReportIdInput(reportId);
    setResult(null);
    verifyMutation.mutate(
      { caseId, reportId },
      {
        onSuccess: (data) => setResult(data),
      }
    );
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Determine which result state we are in
  const isMatch = result && result.verified;
  const isMismatch = result && !result.verified && result.onChainHash !== null;
  const isMissing =
    result &&
    !result.verified &&
    (result.onChainHash === null ||
      result.reason?.toLowerCase().includes('no evidence') ||
      result.reason?.toLowerCase().includes('not configured'));

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#526077] hover:text-[#0F172A] transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

        <span className="font-mono text-xs text-slate-400">
          Independent Forensic Attestation Verifier
        </span>
      </div>

      {/* Header Banner */}
      <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
        <div className="p-3.5 rounded-2xl bg-emerald-50 text-[#10B981]">
          <FileCheck2 className="h-7 w-7" />
        </div>
        <div>
          <h2 className="font-display font-bold text-2xl text-[#0F172A] tracking-tight">
            Cryptographic Evidence Notary & Verification
          </h2>
          <p className="text-xs sm:text-sm text-[#526077] mt-0.5">
            Validate on-chain SHA-256 Merkle signatures anchored in the EvidenceRegistry contract on Polygon Amoy.
          </p>
        </div>
      </div>

      {/* Verification Query Form */}
      <Card variant="elevated" className="p-8 space-y-6">
        <form onSubmit={handleVerify} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0F172A] mb-2 font-mono">
                Investigation Case ID *
              </label>
              <Input
                placeholder="e.g. case_001"
                value={caseIdInput}
                onChange={(e) => setCaseIdInput(e.target.value)}
                className="font-mono text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0F172A] mb-2 font-mono">
                Consensus Registry Network
              </label>
              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Polygon Amoy Testnet</span>
                </span>
                <span className="text-emerald-600 font-bold">#80002</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0F172A] mb-2 font-mono">
              Forensic Report ID *
            </label>
            <Input
              placeholder="e.g. report_001"
              value={reportIdInput}
              onChange={(e) => setReportIdInput(e.target.value)}
              className="font-mono text-sm"
              required
            />
          </div>

          {/* Quick Scenario Buttons */}
          <div className="pt-2">
            <span className="text-[11px] font-mono uppercase font-bold text-slate-400 block mb-2">
              Verification Test Scenarios:
            </span>
            <div className="flex flex-wrap gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => handleQuickScenario('case_001', 'report_001')}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-semibold cursor-pointer transition-colors"
              >
                &bull; Authentic Match
              </button>
              <button
                type="button"
                onClick={() => handleQuickScenario('case_001', 'report_001_tampered_mismatch')}
                className="px-3 py-1.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-semibold cursor-pointer transition-colors"
              >
                &bull; Tampered Mismatch
              </button>
              <button
                type="button"
                onClick={() => handleQuickScenario('case_999_unanchored', 'report_missing')}
                className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 font-semibold cursor-pointer transition-colors"
              >
                &bull; Missing / Unanchored
              </button>
              <button
                type="button"
                onClick={() => handleQuickScenario('case_error', 'report_rpc_error')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 font-semibold cursor-pointer transition-colors"
              >
                &bull; RPC Error
              </button>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
            <span className="text-xs text-[#94A3B8] font-mono flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              <span>Direct cryptographic comparison with EvidenceRegistry contract</span>
            </span>
            <Button
              type="submit"
              variant="primary"
              isLoading={verifyMutation.isPending}
              rightIcon={<ShieldCheck className="h-4 w-4" />}
              className="shrink-0"
            >
              Verify On-Chain Integrity
            </Button>
          </div>
        </form>
      </Card>

      {/* STATE 4: Error State */}
      {verifyMutation.isError && (
        <Card variant="elevated" className="p-8 border-2 border-red-300 bg-red-50/40 space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-red-100 text-red-700 shrink-0">
              <AlertOctagon className="h-8 w-8" />
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-xl text-red-950">
                  Verification Service Error
                </h3>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-800">
                  RPC FAILURE
                </span>
              </div>
              <p className="text-xs text-red-800 leading-relaxed">
                The smart contract verification query could not be completed. Check RPC endpoint connectivity or contract deployment.
              </p>
              <div className="p-3 bg-white rounded-xl border border-red-200 font-mono text-xs text-red-700 break-all">
                {verifyMutation.error?.message || 'Unknown verification error'}
              </div>
              <div className="pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleVerify()}
                  leftIcon={<RotateCw className="h-3.5 w-3.5" />}
                  className="border-red-300 text-red-800 hover:bg-red-50 text-xs"
                >
                  Retry Verification Query
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* STATE 1: Match Screen */}
      {isMatch && (
        <Card
          variant="elevated"
          className="p-8 border-2 border-emerald-300 bg-emerald-50/40 animate-in fade-in duration-300 space-y-6"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-700 shrink-0">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-4 flex-1">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-xl text-emerald-950">
                    Integrity Match Confirmed (Authentic Evidence)
                  </h3>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    MATCH CONFIRMED
                  </span>
                </div>
                <p className="text-xs text-emerald-800 mt-1">
                  The computed document hash matches the immutable consensus record anchored in the EvidenceRegistry contract. Forensic integrity is legally intact.
                </p>
              </div>

              {/* Hash Comparison Monospace Container */}
              <div className="space-y-2 font-mono text-xs">
                <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-700">
                      On-Chain Notarized Hash (Smart Contract)
                    </span>
                    <button
                      onClick={() => handleCopy(result.onChainHash || '', 'onChain')}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {copiedField === 'onChain' ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                  <div className="text-emerald-950 font-bold break-all">{result.onChainHash}</div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-700">
                      Computed Document SHA-256 Digest
                    </span>
                    <button
                      onClick={() => handleCopy(result.computedHash, 'computed')}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {copiedField === 'computed' ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                  <div className="text-emerald-950 font-bold break-all">{result.computedHash}</div>
                </div>
              </div>

              {/* Attestation Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono text-slate-600">
                <div className="p-3 bg-white/90 rounded-xl border border-emerald-100">
                  <span className="text-slate-400 block text-[10px] uppercase">Contract Address</span>
                  <span className="font-bold text-slate-800 truncate block">
                    {result.contractAddress || '0x71c5...7A6B'}
                  </span>
                </div>
                <div className="p-3 bg-white/90 rounded-xl border border-emerald-100">
                  <span className="text-slate-400 block text-[10px] uppercase">Transaction Hash</span>
                  <span className="font-bold text-slate-800 truncate block">
                    {result.transactionHash || '0x3f5c...7e9f'}
                  </span>
                </div>
                <div className="p-3 bg-white/90 rounded-xl border border-emerald-100">
                  <span className="text-slate-400 block text-[10px] uppercase">Evidence Version</span>
                  <span className="font-bold text-slate-800 block">v{result.version || 1}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* STATE 2: Mismatch Screen */}
      {isMismatch && (
        <Card
          variant="elevated"
          className="p-8 border-2 border-red-300 bg-red-50/40 animate-in fade-in duration-300 space-y-6"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-red-100 text-red-700 shrink-0">
              <XCircle className="h-8 w-8" />
            </div>

            <div className="space-y-4 flex-1">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-xl text-red-950">
                    Integrity Verification Mismatch (Tampered Record)
                  </h3>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300">
                    HASH MISMATCH
                  </span>
                </div>
                <p className="text-xs text-red-800 mt-1">
                  The document hash differs from the registered on-chain value. The report content or metadata has been altered after the timestamp of notarization.
                </p>
              </div>

              {/* Hash Comparison with Visual Mismatch Diff */}
              <div className="space-y-2 font-mono text-xs">
                <div className="p-3 bg-white rounded-xl border border-red-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">
                    On-Chain Verified Hash (Smart Contract)
                  </div>
                  <div className="text-slate-800 break-all">{result.onChainHash}</div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-red-300 bg-red-50/30">
                  <div className="text-[10px] uppercase font-bold text-red-600 mb-1 flex items-center justify-between">
                    <span>Computed Document Hash (Altered)</span>
                    <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded">
                      Differs from chain
                    </span>
                  </div>
                  <div className="text-red-700 font-bold break-all">{result.computedHash}</div>
                </div>
              </div>

              <div className="p-3 bg-red-100/60 rounded-xl border border-red-200 text-xs text-red-900 font-mono">
                <span className="font-bold block mb-0.5">Forensic Warning:</span>
                This document would not be admissible as unaltered evidence in legal proceedings.
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* STATE 3: Missing / Unanchored State */}
      {isMissing && (
        <Card
          variant="elevated"
          className="p-8 border-2 border-amber-300 bg-amber-50/40 animate-in fade-in duration-300 space-y-6"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-amber-100 text-amber-700 shrink-0">
              <FileQuestion className="h-8 w-8" />
            </div>

            <div className="space-y-4 flex-1">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-xl text-amber-950">
                    Evidence Record Missing / Not Yet Anchored
                  </h3>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    UNANCHORED
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-1">
                  {result.reason ||
                    'No cryptographic evidence record has been anchored on-chain for this case and report ID.'}
                </p>
              </div>

              <div className="p-4 bg-white rounded-xl border border-amber-200 font-mono text-xs text-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Queried Case:</span>
                  <span className="font-bold text-slate-900">{result.caseId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Queried Report:</span>
                  <span className="font-bold text-slate-900">{result.reportId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Computed Document Hash:</span>
                  <span className="font-bold text-indigo-700 truncate max-w-[280px]">
                    {result.computedHash}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-amber-800">
                  Navigate to the case workspace to generate and notarize this report.
                </span>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => navigate(`/cases/${result.caseId}`)}
                  className="bg-amber-600 hover:bg-amber-700 text-white border-amber-600"
                >
                  Return to Case Workspace
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
