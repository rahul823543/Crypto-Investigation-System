import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Copy,
  Check,
  Shield,
  ArrowUpRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Tabs } from '@/components/ui/Tabs';
import { RiskBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { useCases } from '@/hooks/useCases';
import { useUiStore } from '@/store/uiStore';
import { shortenAddress } from '@/utils/address';
import { formatDate } from '@/utils/formatters';

export const CaseRosterTable: React.FC = () => {
  const { data: cases, isLoading, isError, refetch } = useCases();
  const { searchQuery, tableFilter, setTableFilter } = useUiStore();
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const navigate = useNavigate();

  const copyToClipboard = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const filterTabs = [
    { id: 'all', label: 'All Cases', count: cases?.length || 0 },
    {
      id: 'high',
      label: 'High Risk',
      count: cases?.filter((c) => c.riskLevel === 'high' || c.riskLevel === 'critical').length || 0,
    },
    {
      id: 'analysis',
      label: 'Analysis Complete',
      count: cases?.filter((c) => c.status === 'analysis_complete' || c.status === 'completed' || c.status === 'analyzed').length || 0,
    },
  ];

  const filteredCases = cases?.filter((c) => {
    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = c.caseId.toLowerCase().includes(q);
      const matchAddress = c.rootAddress.toLowerCase().includes(q);
      if (!matchId && !matchAddress) return false;
    }

    // Tab filter match
    if (tableFilter === 'high') {
      return c.riskLevel === 'high' || c.riskLevel === 'critical';
    }
    if (tableFilter === 'analysis') {
      return c.status === 'analysis_complete' || c.status === 'completed' || c.status === 'analyzed';
    }
    return true;
  });

  return (
    <section
      id="cases"
      className="my-10 rounded-3xl bg-white border border-slate-200/80 shadow-[0_10px_35px_rgba(0,0,0,0.03)] p-6 sm:p-8"
    >
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[#0F172A] tracking-tight">
              Active Case Roster
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-xs font-semibold">
              {filteredCases?.length || 0} Registered
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#526077] mt-1">
            Topological multi-hop trace feeds and verifiable cryptographic attestation status.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2">
          <Tabs
            tabs={filterTabs}
            activeTab={tableFilter}
            onChange={setTableFilter}
          />
          <button
            onClick={() => refetch()}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
            title="Refresh cases"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3 py-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="p-8 text-center rounded-2xl bg-red-50/50 border border-red-100">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <h4 className="font-bold text-slate-900">Failed to load investigation cases</h4>
          <p className="text-xs text-slate-500 mt-1">
            Ensure the local mock data or Fastify API is available.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredCases?.length === 0 && (
        <div className="p-12 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
          <Shield className="h-10 w-10 text-slate-400 mx-auto mb-2" />
          <h4 className="font-bold text-slate-800">No matching cases found</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search query or filter, or launch a new investigation from the hero above.
          </p>
        </div>
      )}

      {/* Table Content */}
      {!isLoading && !isError && filteredCases && filteredCases.length > 0 && (
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Case Identifier</TableHead>
              <TableHead>Target Subject</TableHead>
              <TableHead>Risk Score</TableHead>
              <TableHead>Pipeline Stage</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {filteredCases.map((c) => (
              <TableRow
                key={c.caseId}
                onClick={() => navigate(`/cases/${c.caseId}`)}
                className="cursor-pointer group"
              >
                {/* Case Identifier */}
                <TableCell>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {c.caseId}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-semibold border border-purple-100 uppercase">
                        {c.mode}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#94A3B8] mt-0.5">
                      Created {formatDate(c.createdAt)}
                    </span>
                  </div>
                </TableCell>

                {/* Target Subject Address */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 font-mono text-sm text-slate-800 font-semibold">
                        <span>{shortenAddress(c.rootAddress, 4)}</span>
                        <button
                          onClick={(e) => copyToClipboard(c.rootAddress, e)}
                          className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors"
                          title="Copy address"
                        >
                          {copiedAddress === c.rootAddress ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Chain ID #{c.chainId}
                      </span>
                    </div>
                  </div>
                </TableCell>

                {/* Risk Score */}
                <TableCell>
                  <RiskBadge riskLevel={c.riskLevel} score={c.riskScore} />
                </TableCell>

                {/* Pipeline Stage */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" />
                    <span className="font-mono text-xs text-slate-700 capitalize">
                      {c.status.replace('_', ' ')}
                    </span>
                  </div>
                </TableCell>

                {/* Action */}
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    rightIcon={<ArrowUpRight className="h-3.5 w-3.5" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/cases/${c.caseId}`);
                    }}
                    className="group-hover:border-indigo-400 group-hover:text-indigo-600 shadow-2xs"
                  >
                    Inspect
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
};
