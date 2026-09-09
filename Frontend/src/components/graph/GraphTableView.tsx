import React, { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
  Search,
  AlertOctagon,
  Layers,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { RiskBadge } from '@/components/ui/Badge';
import type { GraphNode, GraphEdge, RiskLevel } from '@/types';

export interface GraphTableViewProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  className?: string;
  onSelectNode?: (node: GraphNode) => void;
  onSelectEdge?: (edge: GraphEdge) => void;
}

type NodeSortField = 'address' | 'type' | 'riskLevel' | 'labels' | 'isTraceableDeadEnd';
type EdgeSortField = 'from' | 'to' | 'asset' | 'amount' | 'timestamp' | 'hopDepth' | 'riskLevel';
type SortDirection = 'asc' | 'desc';

const RISK_WEIGHTS: Record<RiskLevel, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export const GraphTableView: React.FC<GraphTableViewProps> = ({
  nodes,
  edges,
  className = '',
  onSelectNode,
  onSelectEdge,
}) => {
  const [activeTableTab, setActiveTableTab] = useState<'nodes' | 'edges' | 'both'>('nodes');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sorting state for Nodes Table
  const [nodeSortField, setNodeSortField] = useState<NodeSortField>('riskLevel');
  const [nodeSortDirection, setNodeSortDirection] = useState<SortDirection>('desc');

  // Sorting state for Edges Table
  const [edgeSortField, setEdgeSortField] = useState<EdgeSortField>('hopDepth');
  const [edgeSortDirection, setEdgeSortDirection] = useState<SortDirection>('asc');

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleNodeSort = (field: NodeSortField) => {
    if (nodeSortField === field) {
      setNodeSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setNodeSortField(field);
      setNodeSortDirection('desc');
    }
  };

  const handleEdgeSort = (field: EdgeSortField) => {
    if (edgeSortField === field) {
      setEdgeSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setEdgeSortField(field);
      setEdgeSortDirection('asc');
    }
  };

  // Filtered and Sorted Nodes
  const filteredSortedNodes = useMemo(() => {
    let result = [...nodes];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.address.toLowerCase().includes(q) ||
          n.type.toLowerCase().includes(q) ||
          n.labels.some((l) => l.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (nodeSortField) {
        case 'address':
          comparison = a.address.localeCompare(b.address);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'riskLevel':
          comparison = (RISK_WEIGHTS[a.riskLevel] || 0) - (RISK_WEIGHTS[b.riskLevel] || 0);
          break;
        case 'labels':
          comparison = a.labels.join(', ').localeCompare(b.labels.join(', '));
          break;
        case 'isTraceableDeadEnd':
          comparison = (a.isTraceableDeadEnd ? 1 : 0) - (b.isTraceableDeadEnd ? 1 : 0);
          break;
      }
      return nodeSortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [nodes, searchQuery, nodeSortField, nodeSortDirection]);

  // Filtered and Sorted Edges
  const filteredSortedEdges = useMemo(() => {
    let result = [...edges];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.from.toLowerCase().includes(q) ||
          e.to.toLowerCase().includes(q) ||
          e.asset.toLowerCase().includes(q) ||
          e.transactionHash.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (edgeSortField) {
        case 'from':
          comparison = a.from.localeCompare(b.from);
          break;
        case 'to':
          comparison = a.to.localeCompare(b.to);
          break;
        case 'asset':
          comparison = a.asset.localeCompare(b.asset);
          break;
        case 'amount': {
          const numA = parseFloat(a.amount) || a.amountUsd || 0;
          const numB = parseFloat(b.amount) || b.amountUsd || 0;
          comparison = numA - numB;
          break;
        }
        case 'timestamp':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'hopDepth':
          comparison = (a.hopDepth ?? 0) - (b.hopDepth ?? 0);
          break;
        case 'riskLevel':
          comparison = (RISK_WEIGHTS[a.riskLevel] || 0) - (RISK_WEIGHTS[b.riskLevel] || 0);
          break;
      }
      return edgeSortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [edges, searchQuery, edgeSortField, edgeSortDirection]);

  // Risk row highlight styling matching the graph view
  const getNodeRowRiskClass = (level: RiskLevel, isDeadEnd?: boolean) => {
    if (isDeadEnd) {
      return 'bg-purple-50/60 hover:bg-purple-100/60 border-l-4 border-l-purple-600 text-slate-900';
    }
    switch (level) {
      case 'critical':
        return 'bg-rose-50/80 hover:bg-rose-100/80 text-slate-900 border-l-4 border-l-rose-600';
      case 'high':
        return 'bg-red-50/60 hover:bg-red-100/60 text-slate-900 border-l-4 border-l-red-500';
      case 'medium':
        return 'bg-amber-50/40 hover:bg-amber-100/40 text-slate-900 border-l-4 border-l-amber-500';
      case 'low':
      default:
        return 'hover:bg-slate-50/80 border-l-4 border-l-transparent text-slate-800';
    }
  };

  const getEdgeRowRiskClass = (level: RiskLevel) => {
    switch (level) {
      case 'critical':
        return 'bg-rose-50/80 hover:bg-rose-100/80 text-slate-900 border-l-4 border-l-rose-600';
      case 'high':
        return 'bg-red-50/60 hover:bg-red-100/60 text-slate-900 border-l-4 border-l-red-500';
      case 'medium':
        return 'bg-amber-50/40 hover:bg-amber-100/40 text-slate-900 border-l-4 border-l-amber-500';
      case 'low':
      default:
        return 'hover:bg-slate-50/80 border-l-4 border-l-transparent text-slate-800';
    }
  };

  const renderSortIcon = (active: boolean, direction: SortDirection) => {
    if (!active) {
      return <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60 ml-1 inline-block" />;
    }
    return direction === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-indigo-600 ml-1 inline-block" />
    ) : (
      <ArrowDown className="h-3 w-3 text-indigo-600 ml-1 inline-block" />
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Sub-header Toolbar: Tabs & Search */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200/60">
          <button
            onClick={() => setActiveTableTab('nodes')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTableTab === 'nodes'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Nodes Table</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-200/70 text-[10px] text-slate-700 font-mono">
              {nodes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTableTab('edges')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTableTab === 'edges'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Edges Table</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-200/70 text-[10px] text-slate-700 font-mono">
              {edges.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTableTab('both')}
            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTableTab === 'both'
                ? 'bg-white text-indigo-600 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>View Both</span>
          </button>
        </div>

        {/* Search filter */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter address, type, asset..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
          />
        </div>
      </div>

      {/* ─── 1. NODES TABLE ──────────────────────────────────────────────── */}
      {(activeTableTab === 'nodes' || activeTableTab === 'both') && (
        <div className="rounded-3xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-600" />
              <h4 className="font-display font-bold text-sm text-slate-900">
                Graph Nodes ({filteredSortedNodes.length} of {nodes.length})
              </h4>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Highlighted by Risk Level
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 text-[11px] font-mono text-slate-500 uppercase bg-slate-50/30 select-none">
                  <th
                    onClick={() => handleNodeSort('address')}
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100/80 transition-colors"
                  >
                    Address {renderSortIcon(nodeSortField === 'address', nodeSortDirection)}
                  </th>
                  <th
                    onClick={() => handleNodeSort('type')}
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100/80 transition-colors"
                  >
                    Type {renderSortIcon(nodeSortField === 'type', nodeSortDirection)}
                  </th>
                  <th
                    onClick={() => handleNodeSort('riskLevel')}
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100/80 transition-colors"
                  >
                    Risk Level {renderSortIcon(nodeSortField === 'riskLevel', nodeSortDirection)}
                  </th>
                  <th
                    onClick={() => handleNodeSort('labels')}
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100/80 transition-colors"
                  >
                    Labels {renderSortIcon(nodeSortField === 'labels', nodeSortDirection)}
                  </th>
                  <th
                    onClick={() => handleNodeSort('isTraceableDeadEnd')}
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100/80 transition-colors text-right"
                  >
                    Dead-End Stop {renderSortIcon(nodeSortField === 'isTraceableDeadEnd', nodeSortDirection)}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredSortedNodes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 font-sans text-xs">
                      No graph nodes matched the filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredSortedNodes.map((node) => {
                    const rowClass = getNodeRowRiskClass(node.riskLevel, node.isTraceableDeadEnd);
                    return (
                      <tr
                        key={node.id}
                        onClick={() => onSelectNode && onSelectNode(node)}
                        className={`transition-colors cursor-pointer ${rowClass}`}
                      >
                        {/* Address */}
                        <td className="py-3.5 px-4 font-semibold">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[200px] sm:max-w-[320px] text-slate-900" title={node.address}>
                              {node.address}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(node.address, node.id);
                              }}
                              className="p-1 rounded hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                              title="Copy Address"
                            >
                              {copiedId === node.id ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                              node.type === 'mixer'
                                ? 'bg-purple-100 text-purple-800 border-purple-300'
                                : node.type === 'dex'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : node.type === 'bridge'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : node.type === 'contract'
                                ? 'bg-slate-100 text-slate-700 border-slate-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {node.type}
                          </span>
                        </td>

                        {/* Risk Level */}
                        <td className="py-3.5 px-4 font-sans">
                          <RiskBadge riskLevel={node.riskLevel} size="sm" />
                        </td>

                        {/* Labels */}
                        <td className="py-3.5 px-4">
                          {node.labels && node.labels.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {node.labels.map((l) => (
                                <span
                                  key={l}
                                  className="px-1.5 py-0.5 rounded bg-white/80 text-slate-700 border border-slate-200 text-[10px] font-medium"
                                >
                                  {l}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>

                        {/* isTraceableDeadEnd */}
                        <td className="py-3.5 px-4 text-right">
                          {node.isTraceableDeadEnd ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-300 font-bold text-[10px]">
                              <AlertOctagon className="h-3 w-3 text-purple-700" />
                              Dead-End Mixer
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">No</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── 2. EDGES TABLE ──────────────────────────────────────────────── */}
      {(activeTableTab === 'edges' || activeTableTab === 'both') && (
        <div className="rounded-3xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-600" />
              <h4 className="font-display font-bold text-sm text-slate-900">
                Graph Edges ({filteredSortedEdges.length} of {edges.length})
              </h4>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Transfer Flows with Hop Depth
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 text-[11px] font-mono text-slate-500 uppercase bg-slate-50/30 select-none">
                  <th
                    onClick={() => handleEdgeSort('from')}
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100/80 transition-colors"
                  >
                    From {renderSortIcon(edgeSortField === 'from', edgeSortDirection)}
                  </th>
                  <th
                    onClick={() => handleEdgeSort('to')}
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100/80 transition-colors"
                  >
                    To {renderSortIcon(edgeSortField === 'to', edgeSortDirection)}
                  </th>
                  <th
                    onClick={() => handleEdgeSort('asset')}
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100/80 transition-colors"
                  >
                    Asset {renderSortIcon(edgeSortField === 'asset', edgeSortDirection)}
                  </th>
                  <th
                    onClick={() => handleEdgeSort('amount')}
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100/80 transition-colors"
                  >
                    Amount {renderSortIcon(edgeSortField === 'amount', edgeSortDirection)}
                  </th>
                  <th
                    onClick={() => handleEdgeSort('timestamp')}
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100/80 transition-colors"
                  >
                    Timestamp {renderSortIcon(edgeSortField === 'timestamp', edgeSortDirection)}
                  </th>
                  <th
                    onClick={() => handleEdgeSort('hopDepth')}
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100/80 transition-colors"
                  >
                    Hop {renderSortIcon(edgeSortField === 'hopDepth', edgeSortDirection)}
                  </th>
                  <th
                    onClick={() => handleEdgeSort('riskLevel')}
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100/80 transition-colors text-right"
                  >
                    Risk {renderSortIcon(edgeSortField === 'riskLevel', edgeSortDirection)}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredSortedEdges.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-sans text-xs">
                      No graph edges matched the filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredSortedEdges.map((edge) => {
                    const rowClass = getEdgeRowRiskClass(edge.riskLevel);
                    return (
                      <tr
                        key={edge.id}
                        onClick={() => onSelectEdge && onSelectEdge(edge)}
                        className={`transition-colors cursor-pointer ${rowClass}`}
                      >
                        {/* From */}
                        <td className="py-3.5 px-4 font-medium">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate max-w-[140px] text-slate-900" title={edge.from}>
                              {edge.from}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(edge.from, `from-${edge.id}`);
                              }}
                              className="p-0.5 rounded hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                              title="Copy From Address"
                            >
                              {copiedId === `from-${edge.id}` ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* To */}
                        <td className="py-3.5 px-4 font-medium">
                          <div className="flex items-center gap-1.5">
                            <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[140px] text-slate-900" title={edge.to}>
                              {edge.to}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(edge.to, `to-${edge.id}`);
                              }}
                              className="p-0.5 rounded hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                              title="Copy To Address"
                            >
                              {copiedId === `to-${edge.id}` ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Asset */}
                        <td className="py-3.5 px-4 font-bold text-indigo-600">
                          {edge.asset}
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900">{edge.amount}</span>
                            {edge.amountUsd > 0 && (
                              <span className="text-[10px] text-slate-500 font-sans">
                                ≈ ${edge.amountUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Timestamp */}
                        <td className="py-3.5 px-4 text-slate-600 font-sans text-[11px] whitespace-nowrap">
                          {edge.timestamp ? new Date(edge.timestamp).toLocaleString() : 'N/A'}
                        </td>

                        {/* Hop Depth */}
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-bold text-[10px]">
                            Hop {edge.hopDepth ?? 1}
                          </span>
                        </td>

                        {/* Risk Level */}
                        <td className="py-3.5 px-4 text-right font-sans">
                          <RiskBadge riskLevel={edge.riskLevel} size="sm" />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
