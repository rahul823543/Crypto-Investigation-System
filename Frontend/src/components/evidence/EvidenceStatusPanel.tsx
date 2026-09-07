import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck2,
  AlertTriangle,
  ArrowRight,
  Copy,
  Check,
  Lock,
  RotateCw,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useEvidence, useAnchorEvidence } from '@/hooks/useEvidence';
import { useCaseReports } from '@/hooks/useReports';

export interface EvidenceStatusPanelProps {
  caseId: string;
  className?: string;
}

export const EvidenceStatusPanel: React.FC<EvidenceStatusPanelProps> = ({
  caseId,
  className = '',
}) => {
  const navigate = useNavigate();
  const { data: evidence, isLoading } = useEvidence(caseId);
  const { data: reports = [] } = useCaseReports(caseId);
  const anchorMutation = useAnchorEvidence();

  const [copiedContract, setCopiedContract] = React.useState(false);
  const [copiedTx, setCopiedTx] = React.useState(false);

  const isAnchored =
    evidence &&
    evidence.transactionHash &&
    evidence.verificationStatus !== 'storage_failed' &&
    evidence.verificationStatus !== 'unanchored';

  const handleCopy = (text: string, type: 'contract' | 'tx') => {
    navigator.clipboard.writeText(text);
    if (type === 'contract') {
      setCopiedContract(true);
      setTimeout(() => setCopiedContract(false), 2000);
    } else {
      setCopiedTx(true);
      setTimeout(() => setCopiedTx(false), 2000);
    }
  };

  const handleAnchor = () => {
    const reportId = reports[0]?.reportId || reports[0]?.id || `report_${caseId}_v1`;
    anchorMutation.mutate({ caseId, reportId });
  };

  if (isLoading) {
    return (
      <div className={`p-8 rounded-3xl bg-white border border-slate-200/80 text-center font-mono text-xs text-slate-400 ${className}`}>
        Checking consensus evidence registry...
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Evidence Status Container */}
      <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-[0_10px_35px_rgba(0,0,0,0.03)] space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className={`p-3.5 rounded-2xl ${
                isAnchored ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
              }`}
            >
              {isAnchored ? <FileCheck2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-slate-900">
                Polygon Amoy Cryptographic Attestation
              </h3>
              <p className="text-xs text-slate-500">
                Immutable SHA-256 evidence anchoring in the decentralized EvidenceRegistry contract.
              </p>
            </div>
          </div>

          <div>
            {isAnchored ? (
              <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-mono text-xs font-semibold border border-emerald-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>On-Chain Notarized</span>
              </span>
            ) : (
              <span className="px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-700 font-mono text-xs font-semibold border border-amber-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Evidence Not Yet Anchored</span>
              </span>
            )}
          </div>
        </div>

        {/* Anchored State Details */}
        {isAnchored ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              {/* Contract Address */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">
                    Contract Address
                  </span>
                  <button
                    onClick={() => handleCopy(evidence.contractAddress || '', 'contract')}
                    className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                    title="Copy Contract Address"
                  >
                    {copiedContract ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <div className="text-slate-800 font-bold break-all text-[11px]">
                  {evidence.contractAddress || '0x71c504A7aFdC370B3C46c24385ea1502476b7A6B'}
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <span>Polygon Amoy Testnet (Chain #80002)</span>
                </div>
              </div>

              {/* Transaction Hash */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">
                    Anchoring Tx Hash
                  </span>
                  <button
                    onClick={() => handleCopy(evidence.transactionHash || '', 'tx')}
                    className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                    title="Copy Transaction Hash"
                  >
                    {copiedTx ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <div className="text-slate-800 font-bold break-all text-[11px]">
                  {evidence.transactionHash}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(evidence.storedAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Evidence Version & State */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Evidence Version & Status
                </span>
                <div className="text-slate-800 font-bold text-sm">
                  Version #{evidence.version} (Immutable)
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Report Ref: {evidence.reportId || 'report_001'}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-emerald-600" />
                <span>Tamper-evident record guaranteed by smart contract EVM consensus.</span>
              </span>

              <Button
                variant="primary"
                onClick={() =>
                  navigate(
                    `/evidence?caseId=${caseId}&reportId=${evidence.reportId || 'report_001'}`
                  )
                }
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Launch Verification Suite
              </Button>
            </div>
          </div>
        ) : (
          /* Missing / Unanchored State */
          <div className="p-6 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-display font-bold text-sm text-amber-900">
                  Case Evidence Has Not Yet Been Stored On-Chain
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Anchoring this case creates a permanent, tamper-evident cryptographic fingerprint of the forensic PDF on the Polygon Amoy blockchain. This ensures evidence cannot be modified or repudiated.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-mono text-amber-700">
                Target: EvidenceRegistry Contract (Chain #80002)
              </span>

              <Button
                variant="primary"
                onClick={handleAnchor}
                isLoading={anchorMutation.isPending}
                leftIcon={<RotateCw className="h-4 w-4" />}
                className="bg-amber-600 hover:bg-amber-700 text-white border-amber-600"
              >
                {anchorMutation.isPending ? 'Anchoring Evidence...' : 'Anchor Evidence to Blockchain'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
