import React from 'react';
import {
  Building2,
  ShieldAlert,
  ArrowRight,
  Focus,
  CheckCircle2,
  Network,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { shortenAddress } from '@/utils/address';
import type { VaspAttribution } from '@/types';

export interface AttributionPanelProps {
  attribution: VaspAttribution | null | undefined;
  isLoading?: boolean;
  onHighlightPath?: (nodeIds: string[], edgeIds: string[]) => void;
  className?: string;
}

export const AttributionPanel: React.FC<AttributionPanelProps> = ({
  attribution,
  isLoading,
  onHighlightPath,
  className,
}) => {
  if (isLoading) {
    return (
      <div className={`p-6 rounded-3xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4 animate-pulse ${className}`}>
        <div className="h-6 w-1/3 bg-slate-200 rounded-md" />
        <div className="h-20 w-full bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (!attribution) {
    return (
      <div className={`p-6 rounded-3xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-3 ${className}`}>
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="p-2 rounded-xl bg-slate-100 text-slate-500">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-slate-900">
              VASP & Exchange Entity Attribution
            </h3>
            <p className="text-xs text-slate-500">
              Identifies the nearest regulated exchange or custodian endpoint.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block text-sm">No Confident VASP Attribution Match</span>
            <p className="text-amber-800 leading-relaxed">
              On-chain flow trajectory did not terminate at a known regulated custodian deposit address, or was severed by a mixer pool before reaching an exchange cluster.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const confidencePercent = Math.round(attribution.confidence * 100);

  const handleHighlight = () => {
    if (onHighlightPath) {
      onHighlightPath(attribution.pathNodeIds, attribution.pathEdgeIds);
    }
  };

  return (
    <div className={`p-6 rounded-3xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-5 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-base text-slate-900">
                Identified Off-Ramp VASP:
              </h3>
              <span className="px-3 py-0.5 rounded-full bg-blue-600 text-white font-display font-bold text-xs shadow-xs">
                {attribution.attributedVasp}
              </span>
            </div>
            <p className="text-xs text-[#526077] mt-0.5">
              Nearest regulated Virtual Asset Service Provider cluster on graph trajectory.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={handleHighlight}
          leftIcon={<Focus className="h-4 w-4" />}
          className="shadow-xs self-start sm:self-auto"
        >
          Highlight Attribution Path
        </Button>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            Hop Distance
          </span>
          <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
            <Network className="h-4 w-4 text-purple-600" />
            <span>{attribution.hopDistance} {attribution.hopDistance === 1 ? 'Hop' : 'Hops'} from Root</span>
          </div>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            Attribution Confidence
          </span>
          <div className="flex items-center justify-between font-bold text-slate-900 text-sm">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{confidencePercent}% Match</span>
            </div>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div
              className={`h-full rounded-full ${
                confidencePercent >= 80
                  ? 'bg-emerald-500'
                  : confidencePercent >= 50
                  ? 'bg-amber-500'
                  : 'bg-slate-400'
              }`}
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            VASP Deposit Node
          </span>
          <span className="font-bold text-slate-800 text-xs truncate block" title={attribution.vaspNodeId}>
            {shortenAddress(attribution.vaspNodeId, 6)}
          </span>
        </div>
      </div>

      {/* Basis Rationale */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
        <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
          Attribution Basis & Traversal Rationale
        </span>
        <p className="text-xs text-slate-700 leading-relaxed font-sans">
          {attribution.basis}
        </p>
      </div>

      {/* Traversal Path Trace Preview */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
          Attribution Trace Chain ({attribution.pathNodeIds.length} Nodes Involved)
        </span>
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {attribution.pathNodeIds.map((nodeId, idx) => (
            <React.Fragment key={nodeId}>
              <span className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold ${
                idx === 0
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : idx === attribution.pathNodeIds.length - 1
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}>
                {shortenAddress(nodeId, 4)}
                {idx === 0 && ' (Root)'}
                {idx === attribution.pathNodeIds.length - 1 && ` (${attribution.attributedVasp})`}
              </span>
              {idx < attribution.pathNodeIds.length - 1 && (
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Secondary Candidates if any */}
      {attribution.secondaryCandidates && attribution.secondaryCandidates.length > 0 && (
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
            Secondary Attribution Candidates
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {attribution.secondaryCandidates.map((sec, i) => (
              <div
                key={i}
                className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Share2 className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-bold text-slate-800">{sec.attributedVasp}</span>
                  <span className="text-[10px] text-slate-400">({sec.hopDistance} hops)</span>
                </div>
                <span className="font-mono font-bold text-slate-600 text-[11px]">
                  {Math.round(sec.confidence * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
