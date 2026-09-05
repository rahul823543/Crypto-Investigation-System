import React from 'react';
import { RiskBadge } from '@/components/ui/Badge';
import type { RiskLevel } from '@/types';

export interface RiskScoreGaugeProps {
  score: number;
  level: RiskLevel;
  className?: string;
}

export const RiskScoreGauge: React.FC<RiskScoreGaugeProps> = ({
  score,
  level,
  className,
}) => {
  const getGradient = () => {
    if (score >= 75) return 'from-[#EF4444] via-rose-500 to-[#F43F5E]';
    if (score >= 40) return 'from-[#FBBF24] via-amber-500 to-orange-500';
    return 'from-[#10B981] via-emerald-500 to-teal-500';
  };

  return (
    <div
      className={`p-6 rounded-3xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-[#526077]">
          Composite Threat Score
        </span>
        <RiskBadge riskLevel={level} />
      </div>

      <div className="flex items-baseline gap-2 my-2">
        <span
          className={`font-display font-extrabold text-5xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r ${getGradient()}`}
        >
          {score}
        </span>
        <span className="font-mono text-slate-400 text-lg font-bold">/ 100</span>
      </div>

      {/* Progress bar track */}
      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-3 mb-2">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${getGradient()} transition-all duration-500`}
          style={{ width: `${Math.max(score, 5)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#94A3B8] font-mono">
        <span>0 (Benign)</span>
        <span>50 (Suspicious)</span>
        <span>100 (Critical)</span>
      </div>
    </div>
  );
};
