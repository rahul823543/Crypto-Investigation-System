import React from 'react';
import {
  Route,
  Focus,
  Repeat,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { shortenAddress } from '@/utils/address';
import type { SuspiciousPath, CircularFlow } from '@/types';

export interface SuspiciousPathsPanelProps {
  paths: SuspiciousPath[];
  circularFlows?: CircularFlow[];
  isLoading?: boolean;
  onHighlightPath?: (nodeIds: string[], edgeIds: string[]) => void;
  className?: string;
}

export const SuspiciousPathsPanel: React.FC<SuspiciousPathsPanelProps> = ({
  paths,
  circularFlows = [],
  isLoading,
  onHighlightPath,
  className,
}) => {
  if (isLoading) {
    return (
      <div className={`p-6 rounded-3xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4 animate-pulse ${className}`}>
        <div className="h-6 w-1/4 bg-slate-200 rounded-md" />
        <div className="h-32 w-full bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (paths.length === 0 && circularFlows.length === 0) {
    return (
      <div className={`p-8 rounded-3xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] text-center space-y-2 ${className}`}>
        <Route className="h-8 w-8 text-slate-400 mx-auto" />
        <h4 className="font-display font-bold text-base text-slate-900">
          No Suspicious Laundering Paths Detected
        </h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Topology analysis did not find high-risk multi-hop laundering trajectories or circular flows for this investigation.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Suspicious Traversal Paths */}
      {paths.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-[#7E22CE]" />
              <h3 className="font-display font-bold text-base text-slate-900 tracking-tight">
                Ranked Suspicious Multi-Hop Paths ({paths.length})
              </h3>
            </div>
            <span className="text-xs font-mono text-[#94A3B8]">
              Ordered by composite laundering risk score
            </span>
          </div>

          <div className="space-y-4">
            {paths.map((path) => {
              const handleHighlight = () => {
                if (onHighlightPath) {
                  onHighlightPath(path.nodeIds, path.edgeIds);
                }
              };

              return (
                <div
                  key={path.id}
                  className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:border-purple-200 transition-all space-y-4 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-2xl bg-purple-50 border border-purple-100 text-[#7E22CE] font-mono font-bold text-xs flex items-center justify-center">
                        #{path.rank}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-sm text-slate-900">
                            Path {path.id}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 font-mono font-bold text-[11px] border border-red-100 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            <span>Risk Score {path.score}/100</span>
                          </span>
                        </div>
                        <span className="text-[11px] text-[#94A3B8] font-mono">
                          {path.nodeIds.length} Nodes • {path.edgeIds.length} Transfers
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleHighlight}
                      leftIcon={<Focus className="h-3.5 w-3.5 text-[#7E22CE]" />}
                      className="group-hover:border-purple-300"
                    >
                      Highlight Path on Graph
                    </Button>
                  </div>

                  <p className="text-xs text-[#526077] leading-relaxed">
                    {path.summary}
                  </p>

                  {/* Reason Codes */}
                  {path.reasonCodes && path.reasonCodes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {path.reasonCodes.map((code) => (
                        <span
                          key={code}
                          className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold"
                        >
                          #{code}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Node Sequence Chain */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-wrap items-center gap-2 font-mono text-xs">
                    {path.nodeIds.map((nodeId, idx) => (
                      <React.Fragment key={`${nodeId}-${idx}`}>
                        <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-800 font-bold text-[11px]">
                          {shortenAddress(nodeId, 4)}
                        </span>
                        {idx < path.nodeIds.length - 1 && (
                          <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Circular Flows Section */}
      {circularFlows.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Repeat className="h-5 w-5 text-amber-600" />
            <h3 className="font-display font-bold text-base text-slate-900 tracking-tight">
              Detected Circular Fund Loops ({circularFlows.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {circularFlows.map((flow) => {
              const handleHighlight = () => {
                if (onHighlightPath) {
                  onHighlightPath(flow.nodeIds, flow.edgeIds);
                }
              };

              return (
                <div
                  key={flow.id}
                  className="p-5 rounded-3xl bg-amber-50/40 border border-amber-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span className="font-display font-bold text-sm text-amber-950">
                          {flow.id}
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono font-bold text-[10px]">
                        {flow.cycleLength}-Hop Cycle
                      </span>
                    </div>

                    <p className="text-xs text-amber-900 leading-relaxed font-sans">
                      {flow.summary}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-amber-100 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-amber-700">
                      {flow.nodeIds.length} cycle entities
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleHighlight}
                      leftIcon={<Focus className="h-3 w-3 text-amber-700" />}
                      className="bg-white hover:bg-amber-50 border-amber-300 text-amber-900 text-xs"
                    >
                      Illuminate Loop
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
