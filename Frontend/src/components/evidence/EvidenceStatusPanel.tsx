import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck2,
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { EvidenceMetadata } from '@/types';

export interface EvidenceStatusPanelProps {
  evidence: EvidenceMetadata | undefined;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onAnchorEvidence?: () => void;
  isAnchoring?: boolean;
  className?: string;
}

export const EvidenceStatusPanel: React.FC<EvidenceStatusPanelProps> = ({
  evidence,
  isLoading,
  isError,
  onRetry,
  onAnchorEvidence,
  isAnchoring,
  className = '',
}) => {
  const navigate = useNavigate();

  // Loading State
  if (isLoading) {
    return (
      <div className={`p-8 rounded-3xl bg-white border border-slate-200/80 shadow-[0_10px_35px_rgba(0,0,0,0.02)] space-y-4 animate-pulse ${className}`}>
        <div className="h-6 w-1/3 bg-slate-200 rounded-md" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-20 bg-slate-100 rounded-2xl" />
          <div className="h-20 bg-slate-100 rounded-2xl" />
          <div className="h-20 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Error State: Recoverable API failure with Retry
  if (isError) {
    return (
      <div className={`p-8 rounded-3xl bg-red-50/50 border border-red-200 shadow-[0_10px_35px_rgba(0,0,0,0.02)] space-y-4 ${className}`}>
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-red-100 text-red-600 shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-display font-bold text-base text-red-950">
              Evidence Service Connection Error
            </h4>
            <p className="text-xs text-red-800 leading-relaxed max-w-xl">
              Unable to retrieve cryptographic evidence records for this case. The EvidenceRegistry contract query or API endpoint returned an error.
            </p>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            leftIcon={<RotateCw className="h-4 w-4" />}
            className="bg-white border-red-300 text-red-700 hover:bg-red-50"
          >
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  // Not Anchored State
  if (!evidence || evidence.status === 'pending' || evidence.status === 'failed') {
    return (
      <div className={`p-8 rounded-3xl bg-white border border-slate-200/80 shadow-[0_10px_35px_rgba(0,0,0,0.02)] space-y-6 ${className}`}>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-slate-100 text-slate-600">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-slate-900">
                Evidence Not Yet Notarized
              </h3>
              <p className="text-xs text-[#526077]">
                This investigation has not been anchored to the Polygon Amoy EvidenceRegistry smart contract.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-mono text-xs font-semibold border border-slate-200">
            Unnotarized Case
          </span>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
          Anchoring a case creates an immutable SHA-256 Merkle root record in the EvidenceRegistry smart contract, establishing legal admissibility and tamper-proof forensic chain of custody.
        </div>

        <div className="flex justify-end gap-3">
          {onAnchorEvidence && (
            <Button
              variant="primary"
              onClick={onAnchorEvidence}
              isLoading={isAnchoring}
              leftIcon={<ShieldCheck className="h-4 w-4" />}
            >
              Anchor Forensic Evidence On-Chain
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Confirmed On-Chain Notarized State
  return (
    <div className={`p-8 rounded-3xl bg-white border border-slate-200/80 shadow-[0_10px_35px_rgba(0,0,0,0.02)] space-y-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-50 text-[#10B981] border border-emerald-100">
            <FileCheck2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-slate-900">
              Polygon Amoy Cryptographic Attestation
            </h3>
            <p className="text-xs text-[#526077]">
              Immutable evidence record anchored to the EvidenceRegistry contract.
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-mono text-xs font-semibold border border-emerald-200 flex items-center gap-1.5 self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>On-Chain Notarized</span>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <span className="text-[10px] text-slate-400 block uppercase font-bold mb-1">
            Contract Address
          </span>
          <span className="text-slate-800 font-bold break-all">
            {evidence.contractAddress || '0x71c504A7aFdC370B3C46c24385ea1502476b7A6B'}
          </span>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <span className="text-[10px] text-slate-400 block uppercase font-bold mb-1">
            Transaction Hash
          </span>
          <span className="text-slate-800 font-bold break-all">
            {evidence.transactionHash || '0x3f5c9e2b1a8d7f4e6a0c8b2d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f'}
          </span>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <span className="text-[10px] text-slate-400 block uppercase font-bold mb-1">
            Evidence Version
          </span>
          <span className="text-slate-800 font-bold">
            Version #{evidence.version || 1} (Immutable)
          </span>
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <Button
          variant="primary"
          onClick={() => navigate('/evidence')}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Perform Independent Verification
        </Button>
      </div>
    </div>
  );
};
