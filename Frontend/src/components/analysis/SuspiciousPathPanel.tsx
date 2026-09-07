import React from 'react';
import {
  Route,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Check,
  Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useInvestigationStore } from '@/store/investigationStore';
import { truncateAddress } from '@/utils/address';
import type { SuspiciousPath } from '@/types';

export interface SuspiciousPathPanelProps {
  paths: SuspiciousPath[];
  onSelectPath?: (path: SuspiciousPath) => void;
  className?: string;
}

export const SuspiciousPathPanel: React.FC<SuspiciousPathPanelProps> = ({
  paths,
  onSelectPath,
  className = '',
}) => {
  const { selectedPathId, selectPath, clearSelection } = useInvestigationStore();

  const sortedPaths = [...paths].sort((a, b) => a.rank - b.rank || b.score - a.score);

  const handleTogglePath = (path: SuspiciousPath) => {
    if (selectedPathId === path.id) {
      clearSelection();
    } else {
      const allIds = [...path.nodeIds, ...path.edgeIds];
      selectPath(path.id, allIds);
      if (onSelectPath) {
        onSelectPath(path);
      }
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  };

  const formatNodeLabel = (nodeId: string) => {
    const parts = nodeId.split(':');
    const type = parts.length > 1 ? parts[0] : 'node';
    const rawAddress = parts.length > 1 ? parts[1] : nodeId;
    return `${type}: ${truncateAddress(rawAddress, 4, 4)}`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <Route className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-slate-900 tracking-tight">
              Ranked Suspicious Paths ({paths.length})
            </h3>
            <p className="text-xs text-slate-500">
              Heuristic and deep traversal graph paths ranked by composite suspicion score.
            </p>
          </div>
        </div>
        {selectedPathId && (
          <button
            onClick={clearSelection}
            className="text-xs font-mono font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
          >
            Clear Active Path
          </button>
        )}
      </div>

      {sortedPaths.length === 0 ? (
        <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-slate-200/80">
          <ShieldAlert className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No suspicious paths detected</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Topology traversal found no high-confidence laundering routes exceeding threshold.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {sortedPaths.map((path) => {
            const isSelected = selectedPathId === path.id;
            const hopCount = path.nodeIds.length - 1;

            return (
              <div
                key={path.id}
                onClick={() => handleTogglePath(path)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50/60 border-indigo-500 ring-2 ring-indigo-200 shadow-md'
                    : 'bg-white border-slate-200/90 hover:border-indigo-200 hover:shadow-sm'
                }`}
              >
                {/* Header: Rank, Score, Trace Button */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-extrabold bg-slate-900 text-white shadow-xs">
                      #{path.rank}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border flex items-center gap-1 ${getScoreColor(
                        path.score
                      )}`}
                    >
                      <Flame className="h-3 w-3" />
                      Score {path.score}/100
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {hopCount} {hopCount === 1 ? 'hop' : 'hops'} ({path.edgeIds.length} transfers)
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant={isSelected ? 'primary' : 'outline'}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePath(path);
                    }}
                    className="text-xs shrink-0"
                    leftIcon={
                      isSelected ? (
                        <Check className="h-3.5 w-3.5 text-white" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                      )
                    }
                  >
                    {isSelected ? 'Route Active' : 'Trace on Graph'}
                  </Button>
                </div>

                {/* Summary narrative */}
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  {path.summary}
                </p>

                {/* Visual Hop Sequence Route */}
                <div className="p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/80 mb-3 overflow-x-auto">
                  <div className="flex items-center gap-1.5 min-w-max text-[11px] font-mono">
                    <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">
                      Route:
                    </span>
                    {path.nodeIds.map((nodeId, idx) => (
                      <React.Fragment key={`${nodeId}-${idx}`}>
                        <span
                          className={`px-2 py-0.5 rounded-md font-semibold border ${
                            idx === 0
                              ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                              : idx === path.nodeIds.length - 1
                              ? 'bg-purple-100 text-purple-800 border-purple-300'
                              : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          {formatNodeLabel(nodeId)}
                        </span>
                        {idx < path.nodeIds.length - 1 && (
                          <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Reason Code Tags */}
                {path.reasonCodes && path.reasonCodes.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {path.reasonCodes.map((code) => (
                      <span
                        key={code}
                        className="px-2 py-0.5 rounded-md bg-slate-100/90 text-slate-600 font-mono text-[10px] font-medium"
                      >
                        #{code}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
