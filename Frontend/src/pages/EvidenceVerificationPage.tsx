import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck2,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useVerifyEvidence } from '@/hooks/useEvidence';
import type { EvidenceVerificationResult } from '@/types';

export const EvidenceVerificationPage: React.FC = () => {
  const [caseIdInput, setCaseIdInput] = useState('case_001');
  const [reportIdInput, setReportIdInput] = useState('report_001');
  const [result, setResult] = useState<EvidenceVerificationResult | null>(null);

  const navigate = useNavigate();
  const verifyMutation = useVerifyEvidence();

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8">
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 text-xs font-semibold text-[#526077] hover:text-[#0F172A] transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Dashboard</span>
      </button>

      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
        <div className="p-3.5 rounded-2xl bg-emerald-50 text-[#10B981]">
          <FileCheck2 className="h-7 w-7" />
        </div>
        <div>
          <h2 className="font-display font-bold text-2xl text-[#0F172A] tracking-tight">
            Cryptographic Evidence Notary & Verification
          </h2>
          <p className="text-xs sm:text-sm text-[#526077] mt-0.5">
            Validate on-chain SHA-256 Merkle signatures anchored in the EvidenceRegistry contract.
          </p>
        </div>
      </div>

      {/* Verification Form */}
      <Card variant="elevated" className="p-8">
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
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0F172A] mb-2 font-mono">
                Consensus Registry Network
              </label>
              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 flex items-center justify-between">
                <span>Polygon Amoy Testnet</span>
                <span className="text-emerald-600 font-bold">#80002</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0F172A] mb-2 font-mono">
              Report ID
            </label>
            <Input
              placeholder="e.g. report_001"
              value={reportIdInput}
              onChange={(e) => setReportIdInput(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs text-[#94A3B8] font-mono">
              Direct verification against smart contract storage
            </span>
            <Button
              type="submit"
              variant="primary"
              isLoading={verifyMutation.isPending}
              rightIcon={<ShieldCheck className="h-4 w-4" />}
            >
              Verify On-Chain Integrity
            </Button>
          </div>
        </form>
      </Card>

      {/* Verification Result Card */}
      {result && (
        <Card
          variant="elevated"
          className={`p-8 animate-in fade-in duration-300 border-2 ${
            result.verified
              ? 'bg-emerald-50/30 border-emerald-300'
              : 'bg-red-50/30 border-red-300'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-2xl shrink-0 ${
                result.verified
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {result.verified ? (
                <CheckCircle2 className="h-8 w-8" />
              ) : (
                <XCircle className="h-8 w-8" />
              )}
            </div>

            <div className="space-y-4 flex-1">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-xl text-[#0F172A]">
                    {result.verified
                      ? 'Integrity Match Confirmed (Authentic Evidence)'
                      : 'Integrity Verification Mismatch'}
                  </h3>
                  <span
                    className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                      result.verified
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {result.verified ? 'MATCH' : 'MISMATCH'}
                  </span>
                </div>
                <p className="text-xs text-[#526077] mt-1">
                  {result.verified
                    ? 'The computed document hash matches the immutable consensus record in the EvidenceRegistry contract.'
                    : 'The document hash differs from the registered on-chain value, indicating possible modification.'}
                </p>
              </div>

              {/* Hash Comparison Box */}
              <div className="space-y-2 font-mono text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-[#94A3B8] mb-1">
                    On-Chain Verified Hash (Smart Contract)
                  </div>
                  <div className="text-slate-800 break-all">{result.onChainHash}</div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-[#94A3B8] mb-1">
                    Computed Document Hash
                  </div>
                  <div className="text-slate-800 break-all">{result.computedHash}</div>
                </div>
              </div>

              {/* Attestation Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono text-slate-600">
                <div className="p-3 bg-white/80 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Contract Address</span>
                  <span className="font-bold text-slate-800 truncate block">
                    {result.contractAddress}
                  </span>
                </div>
                <div className="p-3 bg-white/80 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Transaction Hash</span>
                  <span className="font-bold text-slate-800 truncate block">
                    {result.transactionHash}
                  </span>
                </div>
                <div className="p-3 bg-white/80 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Evidence Version</span>
                  <span className="font-bold text-slate-800 block">v{result.version}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
