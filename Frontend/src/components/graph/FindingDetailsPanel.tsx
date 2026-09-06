import React from 'react';
import {
  AlertTriangle,
  Focus,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RiskBadge } from '@/components/ui/Badge';
import { shortenAddress } from '@/utils/address';
import type { GraphFinding } from '@/types';

export interface FindingDetailsPanelProps {
  finding: GraphFinding;
  onHighlight?: () => void;
  onClearHighlight?: () => void;
  className?: string;
}

export const FindingDetailsPanel: React.FC<FindingDetailsPanelProps> = ({
  finding,
  onHighlight,
  onClearHighlight,
  className,
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-red-50 text-red-600">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
              Risk Finding Detection
            </span>
            <span className="font-display font-bold text-sm text-slate-900">
              {finding.title}
            </span>
          </div>
        </div>
        <RiskBadge riskLevel={finding.severity} size="sm" />
      </div>

      {/* Description */}
      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-[#526077] leading-relaxed">
        {finding.description}
      </div>

      {/* Confidence & Source */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="p-3 bg-white rounded-xl border border-slate-200">
          <span className="text-[10px] text-slate-400 block uppercase font-bold mb-1">
            Engine Confidence
          </span>
          <span className="font-extrabold text-slate-900 text-sm">
            {Math.round(finding.confidence * 100)}%
          </span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200">
          <span className="text-[10px] text-slate-400 block uppercase font-bold mb-1">
            Intelligence Source
          </span>
          <span className="font-bold text-purple-700 capitalize">
            {finding.source.replace('-', ' ')}
          </span>
        </div>
      </div>

      {/* Involved Entities */}
      <div className="space-y-1.5 font-mono text-xs">
        <span className="text-[10px] uppercase font-bold text-slate-400 block">
          Involved Topology Elements ({finding.relatedNodeIds.length} Nodes, {finding.relatedEdgeIds.length} Edges)
        </span>
        <div className="flex flex-wrap gap-1.5">
          {finding.relatedNodeIds.map((id) => (
            <span
              key={id}
              className="px-2 py-0.5 rounded-md bg-purple-50 text-[#7E22CE] font-bold border border-purple-100 text-[11px]"
            >
              {shortenAddress(id, 4)}
            </span>
          ))}
        </div>
      </div>

      {/* Highlight Action */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onClearHighlight}
          leftIcon={<X className="h-3.5 w-3.5" />}
        >
          Clear
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={onHighlight}
          leftIcon={<Focus className="h-3.5 w-3.5" />}
          className="flex-1 shadow-xs"
        >
          Illuminate Flow on Graph
        </Button>
      </div>
    </div>
  );
};
