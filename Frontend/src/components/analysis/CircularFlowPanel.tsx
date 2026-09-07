import React from 'react';
import {
  RotateCcw,
  Sparkles,
  Check,
  Repeat,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useInvestigationStore } from '@/store/investigationStore';
import { truncateAddress } from '@/utils/address';
import type { CircularFlow } from '@/types';

export interface CircularFlowPanelProps {
  circularFlows: CircularFlow[];
  onSelectFlow?: (flow: CircularFlow) => void;
  className?: string;
}

export const CircularFlowPanel: React.FC<CircularFlowPanelProps> = ({
  circularFlows,
  onSelectFlow,
  className = '',
}) => {
  const {
    selectedCircularFlowId,
    selectCircularFlow,
    clearSelection,
  } = useInvestigationStore();

  const handleToggleFlow = (flow: CircularFlow) => {
    if (selectedCircularFlowId === flow.id) {
      clearSelection();
    } else {
      const allIds = [...flow.nodeIds, ...flow.edgeIds];
      selectCircularFlow(flow.id, allIds);
      if (onSelectFlow) {
        onSelectFlow(flow);
      }
    }
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
          <div className="p-2 rounded-xl bg-fuchsia-50 text-fuchsia-600">
            <RotateCcw className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-slate-900 tracking-tight">
              Circular Fund Loops ({circularFlows.length})
            </h3>
            <p className="text-xs text-slate-500">
              Closed-circuit transaction cycles where funds originate, route through intermediaries, and return.
            </p>
          </div>
        </div>
        {selectedCircularFlowId && (
          <button
            onClick={clearSelection}
            className="text-xs font-mono font-medium text-fuchsia-600 hover:text-fuchsia-800 bg-fuchsia-50 hover:bg-fuchsia-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
          >
            Clear Active Loop
          </button>
        )}
      </div>

      {circularFlows.length === 0 ? (
        <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-slate-200/80">
          <Repeat className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No circular flow detected</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Graph traversal confirmed no returning loops or wash transaction cycles.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {circularFlows.map((flow) => {
            const isSelected = selectedCircularFlowId === flow.id;

            return (
              <div
                key={flow.id}
                onClick={() => handleToggleFlow(flow)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-fuchsia-50/60 border-fuchsia-500 ring-2 ring-fuchsia-200 shadow-md'
                    : 'bg-white border-slate-200/90 hover:border-fuchsia-200 hover:shadow-sm'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-300 flex items-center gap-1.5">
                      <Repeat className="h-3 w-3 animate-spin" style={{ animationDuration: '4s' }} />
                      <span>{flow.cycleLength}-Hop Closed Cycle</span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {flow.nodeIds.length} Nodes &bull; {flow.edgeIds.length} Directed Edges
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant={isSelected ? 'primary' : 'outline'}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFlow(flow);
                    }}
                    className={`text-xs shrink-0 ${
                      isSelected
                        ? 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white border-fuchsia-600'
                        : 'text-fuchsia-700 border-fuchsia-300 hover:bg-fuchsia-50'
                    }`}
                    leftIcon={
                      isSelected ? (
                        <Check className="h-3.5 w-3.5 text-white" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-fuchsia-600" />
                      )
                    }
                  >
                    {isSelected ? 'Loop Illuminated' : 'Illuminate Loop on Graph'}
                  </Button>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  {flow.summary}
                </p>

                {/* Circular Node Cycle Breadcrumb */}
                <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 mb-2 overflow-x-auto">
                  <div className="flex items-center gap-1.5 min-w-max text-[11px] font-mono">
                    <span className="text-[10px] uppercase font-bold text-fuchsia-600 mr-1 flex items-center gap-1">
                      <RotateCcw className="h-2.5 w-2.5" /> Loop Sequence:
                    </span>
                    {flow.nodeIds.map((nodeId, idx) => (
                      <React.Fragment key={`${nodeId}-${idx}`}>
                        <span
                          className={`px-2 py-0.5 rounded-md font-semibold border ${
                            idx === 0
                              ? 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300'
                              : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          {formatNodeLabel(nodeId)}
                        </span>
                        <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
                      </React.Fragment>
                    ))}
                    {/* Return to origin node */}
                    <span className="px-2 py-0.5 rounded-md font-bold bg-fuchsia-200 text-fuchsia-900 border border-fuchsia-400 flex items-center gap-1">
                      <span>{formatNodeLabel(flow.nodeIds[0])}</span>
                      <span className="text-[9px] bg-fuchsia-600 text-white px-1 rounded">Return</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-1 font-mono">
                  <AlertCircle className="h-3 w-3 text-fuchsia-500 shrink-0" />
                  <span>
                    Circular fund flows frequently indicate wash-trading or recursive mixer layering to conceal ultimate source of funds.
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
