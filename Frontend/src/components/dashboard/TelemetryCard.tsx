import React from 'react';
import { Network, ShieldCheck, CheckCircle2, Zap } from 'lucide-react';
import { shortenAddress } from '@/utils/address';

export const TelemetryCard: React.FC = () => {
  return (
    <div className="relative w-full max-w-[540px] aspect-[4/3.1] rounded-3xl bg-gradient-to-tr from-white/95 via-slate-50/80 to-purple-50/60 border border-white/90 p-6 sculptural-glow backdrop-blur-xl flex flex-col justify-between overflow-hidden">
      {/* Ambient purple/magenta light glow */}
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-gradient-to-b from-purple-400/25 to-pink-500/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 left-10 w-72 h-36 bg-gradient-to-r from-indigo-300/20 via-fuchsia-300/20 to-transparent blur-xl pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between pb-4 border-b border-slate-100/80">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-ping" />
          <span className="text-[12px] font-bold tracking-wider uppercase text-slate-800">
            Decentralized Graph Ingestion
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Block #63,892,104
        </span>
      </div>

      {/* Center Stage: Floating Cards */}
      <div className="relative z-10 my-auto py-2 flex flex-col gap-3">
        {/* Floating Card 1: Target Ingestion */}
        <div className="p-3.5 bg-white/95 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#7E22CE] flex items-center justify-center shrink-0">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-slate-900 flex items-center gap-1.5">
                <span className="font-mono">{shortenAddress('0x8d2a5789bc10398f42ef937a01d5ce68369f1')}</span>
                <span className="px-1.5 py-0.5 rounded-md bg-red-50 text-[#EF4444] border border-red-100 text-[10px] font-mono font-bold">
                  Flagged
                </span>
              </div>
              <div className="text-[11px] text-[#94A3B8]">
                Recursive 3-Hop Topology Trace
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm font-mono font-extrabold text-slate-900">
              78 / 100
            </span>
            <div className="text-[10px] text-slate-400 font-medium">Threat Score</div>
          </div>
        </div>

        {/* Floating Card 2: Consensus Anchor */}
        <div className="p-3.5 bg-white/95 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between backdrop-blur-md ml-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#10B981] flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-slate-900">
                EIP-712 Consensus Anchor
              </div>
              <div className="text-[11px] text-[#94A3B8] font-mono truncate max-w-[190px]">
                0x48a0f90e8a719c8f...b9914
              </div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-[#10B981] border border-emerald-100 text-[11px] font-semibold flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>Notarized</span>
          </span>
        </div>
      </div>

      {/* Bottom Telemetry Bar */}
      <div className="relative z-10 pt-3 border-t border-slate-100/80 flex items-center justify-between text-[11px] text-[#94A3B8]">
        <span className="flex items-center gap-1 text-slate-600 font-medium">
          <Zap className="h-3.5 w-3.5 text-[#7E22CE]" />
          <span>Latency: 1.4s (p99: 2.1s)</span>
        </span>
        <span className="font-mono text-slate-500 font-semibold">
          Oracles 100% Synced
        </span>
      </div>
    </div>
  );
};
