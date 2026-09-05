import React from 'react';
import {
  Network,
  DollarSign,
  AlertTriangle,
  GitFork,
} from 'lucide-react';

export interface CaseMetricsGridProps {
  nodeCount?: number;
  edgeCount?: number;
  maxHopDepth?: number;
  totalVolumeUsd?: number;
  findingCount?: number;
  className?: string;
}

export const CaseMetricsGrid: React.FC<CaseMetricsGridProps> = ({
  nodeCount = 6,
  edgeCount = 5,
  maxHopDepth = 3,
  totalVolumeUsd = 17800,
  findingCount = 2,
  className,
}) => {
  const cards = [
    {
      label: 'Multi-Hop Depth',
      value: `${maxHopDepth} Hops`,
      subtext: 'Recursive Breadth Trace',
      icon: GitFork,
      color: 'text-[#4F46E5] bg-indigo-50 border-indigo-100',
    },
    {
      label: 'Traced Flow Volume',
      value: `$${totalVolumeUsd.toLocaleString()}`,
      subtext: 'USDC & POL transfers',
      icon: DollarSign,
      color: 'text-[#10B981] bg-emerald-50 border-emerald-100',
    },
    {
      label: 'Topology Entities',
      value: `${nodeCount} / ${edgeCount}`,
      subtext: 'Nodes & Directed Edges',
      icon: Network,
      color: 'text-[#7E22CE] bg-purple-50 border-purple-100',
    },
    {
      label: 'Risk Findings',
      value: `${findingCount} Flagged`,
      subtext: 'Fan-out & DEX swaps',
      icon: AlertTriangle,
      color: 'text-[#EF4444] bg-red-50 border-red-100',
      valueColor: 'text-[#EF4444]',
    },
  ];

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-purple-200 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#526077] uppercase tracking-wider">
                {c.label}
              </span>
              <div
                className={`p-2 rounded-xl border ${c.color} flex items-center justify-center transition-transform group-hover:scale-110`}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div
              className={`font-display font-extrabold text-2xl sm:text-3xl tracking-tight leading-none mb-1.5 ${
                c.valueColor || 'text-[#0F172A]'
              }`}
            >
              {c.value}
            </div>

            <span className="text-[11px] font-mono text-[#94A3B8]">
              {c.subtext}
            </span>
          </div>
        );
      })}
    </div>
  );
};
