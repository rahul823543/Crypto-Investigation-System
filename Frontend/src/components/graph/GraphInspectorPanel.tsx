import React from 'react';
import {
  MousePointerClick,
  X,
  Route,
  RotateCcw,
} from 'lucide-react';
import { useInvestigationStore } from '@/store/investigationStore';
import { WalletDetailsPanel } from './WalletDetailsPanel';
import { TransactionDetailsPanel } from './TransactionDetailsPanel';
import { FindingDetailsPanel } from './FindingDetailsPanel';
import type { GraphNode, GraphEdge, GraphFinding, SuspiciousPath, CircularFlow } from '@/types';

export interface GraphInspectorPanelProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  findings: GraphFinding[];
  paths?: SuspiciousPath[];
  circularFlows?: CircularFlow[];
  onHighlightFinding?: (finding: GraphFinding) => void;
  className?: string;
}

export const GraphInspectorPanel: React.FC<GraphInspectorPanelProps> = ({
  nodes,
  edges,
  findings,
  paths = [],
  circularFlows = [],
  onHighlightFinding,
  className = '',
}) => {
  const {
    selectedNodeId,
    selectedEdgeId,
    selectedFindingId,
    selectedPathId,
    selectedCircularFlowId,
    clearSelection,
  } = useInvestigationStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId);
  const selectedFinding = findings.find((f) => f.id === selectedFindingId);
  const selectedPath = paths.find((p) => p.id === selectedPathId);
  const selectedLoop = circularFlows.find((c) => c.id === selectedCircularFlowId);

  const hasSelection = !!(
    selectedNode ||
    selectedEdge ||
    selectedFinding ||
    selectedPath ||
    selectedLoop
  );

  return (
    <div
      className={`p-6 rounded-3xl bg-white border border-slate-200/80 shadow-[0_10px_35px_rgba(0,0,0,0.03)] flex flex-col justify-between ${className}`}
    >
      {hasSelection && (
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
            Inspector Focus
          </span>
          <button
            onClick={clearSelection}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors text-xs font-mono flex items-center gap-1 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        </div>
      )}

      {selectedNode && <WalletDetailsPanel node={selectedNode} />}
      {selectedEdge && <TransactionDetailsPanel edge={selectedEdge} />}
      {selectedFinding && (
        <FindingDetailsPanel
          finding={selectedFinding}
          onHighlight={() => onHighlightFinding && onHighlightFinding(selectedFinding)}
          onClearHighlight={clearSelection}
        />
      )}

      {/* Suspicious Path Focus View */}
      {selectedPath && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Route className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-indigo-600 block">
                Active Suspicious Route #{selectedPath.rank}
              </span>
              <h4 className="font-display font-bold text-sm text-slate-900">
                Threat Score: {selectedPath.score}/100
              </h4>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
            {selectedPath.summary}
          </p>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400">Node Hops</span>
              <span className="font-bold text-slate-800">{selectedPath.nodeIds.length} addresses</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400">Transfers</span>
              <span className="font-bold text-slate-800">{selectedPath.edgeIds.length} edges</span>
            </div>
          </div>

          {selectedPath.reasonCodes && selectedPath.reasonCodes.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {selectedPath.reasonCodes.map((code) => (
                <span
                  key={code}
                  className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[10px]"
                >
                  #{code}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Circular Flow Focus View */}
      {selectedLoop && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-fuchsia-50 text-fuchsia-600">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-fuchsia-600 block">
                Active Circular Flow
              </span>
              <h4 className="font-display font-bold text-sm text-slate-900">
                {selectedLoop.cycleLength}-Hop Closed Cycle
              </h4>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed bg-fuchsia-50/50 p-3 rounded-xl border border-fuchsia-200">
            {selectedLoop.summary}
          </p>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400">Cycle Length</span>
              <span className="font-bold text-fuchsia-700">{selectedLoop.cycleLength} hops</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400">Loop Participants</span>
              <span className="font-bold text-slate-800">{selectedLoop.nodeIds.length} nodes</span>
            </div>
          </div>
        </div>
      )}

      {!hasSelection && (
        <div className="py-12 px-4 text-center space-y-3 my-auto">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
            <MousePointerClick className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-display font-bold text-sm text-slate-800">
              Interactive Topology Inspector
            </h4>
            <p className="text-xs text-[#94A3B8] max-w-[220px] mx-auto mt-1 leading-relaxed">
              Click any node, transaction edge, risk finding, suspicious path, or loop to inspect forensic details in real-time.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
