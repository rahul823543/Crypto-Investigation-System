import React from 'react';
import {
  MousePointerClick,
  X,
} from 'lucide-react';
import { useInvestigationStore } from '@/store/investigationStore';
import { WalletDetailsPanel } from './WalletDetailsPanel';
import { TransactionDetailsPanel } from './TransactionDetailsPanel';
import { FindingDetailsPanel } from './FindingDetailsPanel';
import type { GraphNode, GraphEdge, GraphFinding } from '@/types';

export interface GraphInspectorPanelProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  findings: GraphFinding[];
  onHighlightFinding?: (finding: GraphFinding) => void;
  className?: string;
}

export const GraphInspectorPanel: React.FC<GraphInspectorPanelProps> = ({
  nodes,
  edges,
  findings,
  onHighlightFinding,
  className,
}) => {
  const {
    selectedNodeId,
    selectedEdgeId,
    selectedFindingId,
    clearSelection,
  } = useInvestigationStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId);
  const selectedFinding = findings.find((f) => f.id === selectedFindingId);

  const hasSelection = !!(selectedNode || selectedEdge || selectedFinding);

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
              Click any node, transaction edge, or risk finding to inspect forensic details in real-time.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
