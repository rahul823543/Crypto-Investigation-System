import React, { useState } from 'react';
import {
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
  Layers,
  Clock,
} from 'lucide-react';
import { RiskBadge } from '@/components/ui/Badge';
import { shortenAddress } from '@/utils/address';
import type { GraphEdge } from '@/types';

export interface TransactionDetailsPanelProps {
  edge: GraphEdge;
  className?: string;
}

export const TransactionDetailsPanel: React.FC<TransactionDetailsPanelProps> = ({
  edge,
  className,
}) => {
  const [copied, setCopied] = useState(false);

  const copyHash = () => {
    navigator.clipboard.writeText(edge.transactionHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 text-[#4F46E5]">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
              Directed Transfer Link
            </span>
            <span className="font-display font-bold text-sm text-slate-900 capitalize">
              {edge.transferType.replace('_', ' ')}
            </span>
          </div>
        </div>
        <RiskBadge riskLevel={edge.riskLevel} size="sm" />
      </div>

      {/* Transaction Hash */}
      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 font-mono text-xs">
        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
          Transaction Hash
        </span>
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-slate-900 break-all select-all">
            {edge.transactionHash}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={copyHash}
              className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              title="Copy tx hash"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
            <a
              href={`https://amoy.polygonscan.com/tx/${edge.transactionHash}`}
              target="_blank"
              rel="noreferrer"
              className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-900 transition-colors"
              title="View on block explorer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Transfer Route */}
      <div className="p-3 bg-white rounded-xl border border-slate-200 font-mono text-xs space-y-2">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[10px] uppercase font-bold text-slate-400">From Sender</span>
          <span className="font-bold text-slate-800">{shortenAddress(edge.from, 5)}</span>
        </div>
        <div className="flex items-center justify-center text-slate-300">
          <ArrowRight className="h-4 w-4" />
        </div>
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[10px] uppercase font-bold text-slate-400">To Recipient</span>
          <span className="font-bold text-slate-800">{shortenAddress(edge.to, 5)}</span>
        </div>
      </div>

      {/* Amount and Value */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="p-3 bg-white rounded-xl border border-slate-200">
          <span className="text-[10px] text-slate-400 block uppercase font-bold mb-1">
            Token Amount
          </span>
          <span className="font-extrabold text-slate-900 text-sm">
            {edge.amount} {edge.asset}
          </span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200">
          <span className="text-[10px] text-slate-400 block uppercase font-bold mb-1">
            USD Value
          </span>
          <span className="font-extrabold text-slate-900 text-sm">
            ${edge.amountUsd.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Hop Level & Timestamp */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-slate-500">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          <span>{edge.timestamp}</span>
        </span>
        <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
          Hop Level #{edge.hopDepth}
        </span>
      </div>
    </div>
  );
};
