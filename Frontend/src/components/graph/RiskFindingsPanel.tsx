import React from 'react';
import {
  AlertTriangle,
  Focus,
  Cpu,
  Flame,
  Shuffle,
  Layers,
  Building2,
  Ban,
  Repeat,
} from 'lucide-react';
import { RiskBadge } from '@/components/ui/Badge';
import { useInvestigationStore } from '@/store/investigationStore';
import type { GraphFinding } from '@/types';

export interface RiskFindingsPanelProps {
  findings: GraphFinding[];
  onHighlightFinding?: (finding: GraphFinding) => void;
  className?: string;
}

export const RiskFindingsPanel: React.FC<RiskFindingsPanelProps> = ({
  findings,
  onHighlightFinding,
  className,
}) => {
  const { selectedFindingId, selectFinding } = useInvestigationStore();

  const getFindingIcon = (type: string) => {
    switch (type) {
      case 'fan_out':
      case 'rapid_movement':
        return Flame;
      case 'dex_interaction':
        return Shuffle;
      case 'bridge_interaction':
        return Layers;
      case 'mixer_interaction':
        return Ban;
      case 'vasp_direct_touch':
        return Building2;
      case 'circular_flow':
        return Repeat;
      default:
        return AlertTriangle;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-[#7E22CE]" />
          <h3 className="font-display font-bold text-base text-slate-900 tracking-tight">
            Detected Laundering Findings ({findings.length})
          </h3>
        </div>
        <span className="text-xs font-mono text-[#94A3B8]">
          Click card to illuminate flow path
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {findings.map((f) => {
          const Icon = getFindingIcon(f.type);
          const isSelected = selectedFindingId === f.id;

          const isVaspTouch = f.type === 'vasp_direct_touch';
          const isMixer = f.type === 'mixer_interaction';

          return (
            <div
              key={f.id}
              onClick={() => {
                const allRelated = [...f.relatedNodeIds, ...f.relatedEdgeIds];
                selectFinding(f.id, allRelated);
                if (onHighlightFinding) onHighlightFinding(f);
              }}
              className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between group ${
                isSelected
                  ? 'bg-purple-50/80 border-[#7E22CE] ring-2 ring-purple-200 shadow-md'
                  : 'bg-white border-slate-200/80 hover:border-purple-200 shadow-[0_4px_20px_rgba(0,0,0,0.02)]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2.5 rounded-2xl border ${
                        isVaspTouch
                          ? 'bg-blue-50 text-blue-600 border-blue-100'
                          : isMixer || f.severity === 'high' || f.severity === 'critical'
                          ? 'bg-red-50 text-red-600 border-red-100'
                          : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-sm text-slate-900 group-hover:text-[#4F46E5] transition-colors">
                        {f.title}
                      </h4>
                      <span className="text-[10px] font-mono text-[#94A3B8] capitalize">
                        {f.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                  {isVaspTouch ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono text-xs font-semibold border border-blue-200">
                      VASP Info
                    </span>
                  ) : (
                    <RiskBadge riskLevel={f.severity} size="sm" />
                  )}
                </div>

                <p className="text-xs text-[#526077] leading-relaxed">
                  {f.description}
                </p>

                {/* Trigger Signals */}
                {f.signals.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {f.signals.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono text-[10px]"
                      >
                        #{s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Link Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-400 font-mono text-[11px]">
                  Confidence: {Math.round(f.confidence * 100)}%
                </span>
                <span className="text-[#4F46E5] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <Focus className="h-3.5 w-3.5" />
                  <span>Highlight on Graph</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
