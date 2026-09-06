import React, { useState } from 'react';
import {
  Wallet,
  Copy,
  Check,
  ExternalLink,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { RiskBadge } from '@/components/ui/Badge';
import type { GraphNode } from '@/types';

export interface WalletDetailsPanelProps {
  node: GraphNode;
  onClose?: () => void;
  className?: string;
}

export const WalletDetailsPanel: React.FC<WalletDetailsPanelProps> = ({
  node,
  className,
}) => {
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(node.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isRoot = node.labels.includes('root');

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-50 text-[#7E22CE]">
            <Wallet className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
              {isRoot ? '★ Primary Root Target' : 'Topology Node'}
            </span>
            <span className="font-display font-bold text-sm text-slate-900 capitalize">
              {node.type.replace('_', ' ')}
            </span>
          </div>
        </div>
        <RiskBadge riskLevel={node.riskLevel} size="sm" />
      </div>

      {/* Address Card */}
      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 font-mono text-xs">
        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
          EVM Address
        </span>
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-slate-900 break-all select-all">
            {node.address}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={copyAddress}
              className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              title="Copy address"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
            <a
              href={`https://amoy.polygonscan.com/address/${node.address}`}
              target="_blank"
              rel="noreferrer"
              className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-900 transition-colors"
              title="Open block explorer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Flow Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="p-3 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase font-bold mb-1">
            <ArrowDownLeft className="h-3 w-3 text-emerald-500" />
            <span>Total Inflow</span>
          </div>
          <span className="font-extrabold text-slate-900 text-sm">
            ${node.totalInUsd.toLocaleString()}
          </span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase font-bold mb-1">
            <ArrowUpRight className="h-3 w-3 text-red-500" />
            <span>Total Outflow</span>
          </div>
          <span className="font-extrabold text-slate-900 text-sm">
            ${node.totalOutUsd.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Labels / Tags */}
      {node.labels.length > 0 && (
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block mb-1.5">
            Entity Classification
          </span>
          <div className="flex flex-wrap gap-1.5">
            {node.labels.map((label) => (
              <span
                key={label}
                className="px-2.5 py-0.5 rounded-full bg-purple-50 text-[#7E22CE] font-mono text-[11px] font-semibold border border-purple-100"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Hop Depth */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-slate-500">
        <span>Topological Hop Distance:</span>
        <span className="font-bold text-slate-800">
          {node.hopDepth === 0 ? 'Origin (Hop #0)' : `Hop #${node.hopDepth}`}
        </span>
      </div>
    </div>
  );
};
