import React, { useState } from 'react';
import {
  ShieldAlert,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { RiskBadge } from '@/components/ui/Badge';
import { formatDate } from '@/utils/formatters';
import type { CaseDetail } from '@/types';

export interface CaseSubjectCardProps {
  caseDetail: CaseDetail;
  className?: string;
}

export const CaseSubjectCard: React.FC<CaseSubjectCardProps> = ({
  caseDetail,
  className,
}) => {
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(caseDetail.rootAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getExplorerUrl = (address: string, chainId: number) => {
    if (chainId === 80002) return `https://amoy.polygonscan.com/address/${address}`;
    if (chainId === 137) return `https://polygonscan.com/address/${address}`;
    return `https://etherscan.io/address/${address}`;
  };

  return (
    <div
      className={`p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/80 shadow-[0_10px_35px_rgba(0,0,0,0.03)] flex flex-col justify-between ${className}`}
    >
      <div>
        {/* Top Eyebrow & Status */}
        <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#7E22CE] flex items-center justify-center shrink-0">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-[#94A3B8] block">
                Primary Target Subject
              </span>
              <span className="font-display font-bold text-sm text-slate-900">
                Suspect EVM Origin
              </span>
            </div>
          </div>
          <RiskBadge riskLevel={caseDetail.riskLevel} score={caseDetail.riskScore} />
        </div>

        {/* Target Address Card */}
        <div className="mt-5 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1.5">
            EVM Address Digest
          </span>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 break-all select-all">
              {caseDetail.rootAddress}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={copyAddress}
                className="p-1.5 hover:bg-slate-200/70 rounded-lg text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                title="Copy full address"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
              <a
                href={getExplorerUrl(caseDetail.rootAddress, caseDetail.chainId)}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 hover:bg-slate-200/70 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                title="View on block explorer"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Metadata Details Grid */}
        <div className="grid grid-cols-2 gap-3 mt-4 text-xs font-mono">
          <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-2xs">
            <span className="text-[10px] text-[#94A3B8] block uppercase">Network Ledger</span>
            <span className="font-bold text-slate-800">
              Chain #{caseDetail.chainId}
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-2xs">
            <span className="text-[10px] text-[#94A3B8] block uppercase">Triage Mode</span>
            <span className="font-bold text-purple-700 capitalize">
              {caseDetail.mode} Session
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-2xs">
            <span className="text-[10px] text-[#94A3B8] block uppercase">Created Time</span>
            <span className="font-bold text-slate-800">
              {formatDate(caseDetail.createdAt)}
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-2xs">
            <span className="text-[10px] text-[#94A3B8] block uppercase">Status Flag</span>
            <span className="font-bold text-emerald-600 capitalize">
              {caseDetail.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
