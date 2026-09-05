import React from 'react';
import {
  Flame,
  Shuffle,
  RefreshCw,
  Cpu,
  Layers,
} from 'lucide-react';
import { RiskBadge } from '@/components/ui/Badge';

export interface RiskMatrixBreakdownProps {
  className?: string;
}

export const RiskMatrixBreakdown: React.FC<RiskMatrixBreakdownProps> = ({ className }) => {
  const factors = [
    {
      name: 'High-Velocity Fan-Out',
      description: '4 rapid transfers originating from root within a 7-minute burst window.',
      severity: 'high' as const,
      score: '90%',
      icon: Flame,
      color: 'text-red-600 bg-red-50 border-red-100',
    },
    {
      name: 'DEX Obfuscation Pool',
      description: 'QuickSwap V2 Router interaction to swap 5,000 USDC into alternate assets.',
      severity: 'medium' as const,
      score: '68%',
      icon: Shuffle,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    {
      name: 'Multi-Hop Bridge Transit',
      description: 'Hop Protocol relay bridge node identified in downstream hop path.',
      severity: 'medium' as const,
      score: '54%',
      icon: Layers,
      color: 'text-purple-600 bg-purple-50 border-purple-100',
    },
    {
      name: 'Circular Loops (Wash Trading)',
      description: 'No circular fund flow returns detected to root or immediate peers.',
      severity: 'low' as const,
      score: '0%',
      icon: RefreshCw,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
  ];

  return (
    <div
      className={`p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/80 shadow-[0_10px_35px_rgba(0,0,0,0.03)] ${className}`}
    >
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-[#7E22CE]" />
          <h3 className="font-display font-bold text-base text-slate-900 tracking-tight">
            Heuristic Risk Matrix
          </h3>
        </div>
        <span className="text-xs font-mono text-[#526077]">
          4 Vector Signals Evaluated
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {factors.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.name}
              className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 flex flex-col justify-between hover:bg-slate-50 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl border ${f.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="font-display font-bold text-sm text-slate-900">
                      {f.name}
                    </span>
                  </div>
                  <RiskBadge riskLevel={f.severity} size="sm" />
                </div>
                <p className="text-xs text-[#526077] leading-relaxed pl-1">
                  {f.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">Threat Weight</span>
                <span className="font-bold text-slate-800">{f.score}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
