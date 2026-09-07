import React, { useState, useMemo } from 'react';
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
  Search,
  Filter,
  Brain,
  ShieldCheck,
} from 'lucide-react';
import { RiskBadge } from '@/components/ui/Badge';
import { useInvestigationStore } from '@/store/investigationStore';
import type { GraphFinding, FindingSource, RiskLevel } from '@/types';

export interface RiskFindingsPanelProps {
  findings: GraphFinding[];
  advancedFindings?: GraphFinding[];
  onHighlightFinding?: (finding: GraphFinding) => void;
  className?: string;
}

export const RiskFindingsPanel: React.FC<RiskFindingsPanelProps> = ({
  findings = [],
  advancedFindings = [],
  onHighlightFinding,
  className = '',
}) => {
  const { selectedFindingId, selectFinding } = useInvestigationStore();
  const [sourceFilter, setSourceFilter] = useState<'all' | FindingSource>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | RiskLevel>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Unify and deduplicate basic and advanced findings
  const unifiedFindings = useMemo(() => {
    const map = new Map<string, GraphFinding>();
    findings.forEach((f) => map.set(f.id, f));
    advancedFindings.forEach((f) => map.set(f.id, f));
    return Array.from(map.values());
  }, [findings, advancedFindings]);

  // Counts by source
  const basicCount = unifiedFindings.filter((f) => f.source === 'basic-risk').length;
  const advancedCount = unifiedFindings.filter((f) => f.source === 'python-intelligence').length;

  // Filtered findings
  const filteredFindings = useMemo(() => {
    return unifiedFindings.filter((f) => {
      // Source filter
      if (sourceFilter !== 'all' && f.source !== sourceFilter) return false;
      // Severity filter
      if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = f.title.toLowerCase().includes(q);
        const matchDesc = f.description.toLowerCase().includes(q);
        const matchSignal = f.signals.some((s) => s.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchSignal) return false;
      }
      return true;
    });
  }, [unifiedFindings, sourceFilter, severityFilter, searchQuery]);

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
    <div className={`space-y-5 ${className}`}>
      {/* Header and Source Filter Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-50 text-[#7E22CE]">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-slate-900 tracking-tight">
              Unified Risk Findings & Vectors ({unifiedFindings.length})
            </h3>
            <p className="text-xs text-slate-500">
              Merged heuristics, pattern recognition, and advanced graph AI intelligence findings.
            </p>
          </div>
        </div>

        {/* Source Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl self-start md:self-auto text-xs font-mono">
          <button
            onClick={() => setSourceFilter('all')}
            className={`px-3 py-1 rounded-lg transition-colors font-semibold cursor-pointer ${
              sourceFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({unifiedFindings.length})
          </button>
          <button
            onClick={() => setSourceFilter('basic-risk')}
            className={`px-3 py-1 rounded-lg transition-colors font-semibold flex items-center gap-1.5 cursor-pointer ${
              sourceFilter === 'basic-risk'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-indigo-700'
            }`}
          >
            <ShieldCheck className="h-3 w-3 text-indigo-500" />
            <span>Rule Engine ({basicCount})</span>
          </button>
          <button
            onClick={() => setSourceFilter('python-intelligence')}
            className={`px-3 py-1 rounded-lg transition-colors font-semibold flex items-center gap-1.5 cursor-pointer ${
              sourceFilter === 'python-intelligence'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-purple-700'
            }`}
          >
            <Brain className="h-3 w-3 text-purple-500" />
            <span>AI Traversal ({advancedCount})</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search findings by pattern, keyword, or signal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all font-sans"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-200 cursor-pointer w-full sm:w-auto"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical Only</option>
            <option value="high">High Only</option>
            <option value="medium">Medium Only</option>
            <option value="low">Low Only</option>
          </select>
        </div>
      </div>

      {/* Findings Grid */}
      {filteredFindings.length === 0 ? (
        <div className="p-10 text-center bg-slate-50/50 rounded-2xl border border-slate-200/80">
          <AlertTriangle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No matching findings</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Adjust search keywords or filter criteria to view findings.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFindings.map((f) => {
            const Icon = getFindingIcon(f.type);
            const isSelected = selectedFindingId === f.id;
            const isAdvanced = f.source === 'python-intelligence';
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
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                  isSelected
                    ? 'bg-purple-50/80 border-[#7E22CE] ring-2 ring-purple-200 shadow-md'
                    : 'bg-white border-slate-200/80 hover:border-purple-200 shadow-[0_4px_20px_rgba(0,0,0,0.02)]'
                }`}
              >
                <div>
                  {/* Card Header: Type, Source Badge, Severity */}
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
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider ${
                              isAdvanced
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {isAdvanced ? 'AI Traversal' : 'Rule Engine'}
                          </span>
                          <span className="text-[10px] font-mono text-[#94A3B8] capitalize">
                            &bull; {f.type.replace(/_/g, ' ')}
                          </span>
                        </div>
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
                  {f.signals && f.signals.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {f.signals.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[10px]"
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
                    Confidence: {Math.round((f.confidence || 0.85) * 100)}%
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
      )}
    </div>
  );
};
