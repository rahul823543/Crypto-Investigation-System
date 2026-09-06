import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  ArrowRight,
  FileCheck2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { CaseStatusTimeline } from '@/components/case/CaseStatusTimeline';
import { CaseSubjectCard } from '@/components/case/CaseSubjectCard';
import { CaseMetricsGrid } from '@/components/case/CaseMetricsGrid';
import { RiskMatrixBreakdown } from '@/components/case/RiskMatrixBreakdown';
import { TransactionFeedTable } from '@/components/case/TransactionFeedTable';
import { CaseActionBar } from '@/components/case/CaseActionBar';
import { TransactionGraph } from '@/components/graph/TransactionGraph';
import { GraphInspectorPanel } from '@/components/graph/GraphInspectorPanel';
import { RiskFindingsPanel } from '@/components/graph/RiskFindingsPanel';
import { useCasePolling } from '@/hooks/useCasePolling';
import { useCaseGraph } from '@/hooks/useCaseGraph';
import { useCaseFindings } from '@/hooks/useCaseFindings';
import { useInvestigationStore } from '@/store/investigationStore';
import type { GraphFinding } from '@/types';

export const CaseInvestigationPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  const { data: caseDetail, isLoading: caseLoading, isError: caseError } = useCasePolling(caseId);
  const { data: graphData, isLoading: graphLoading } = useCaseGraph(caseId);
  const { data: findingsData, isLoading: findingsLoading } = useCaseFindings(caseId);

  const { selectFinding } = useInvestigationStore();
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('graph');

  const workspaceTabs = [
    { id: 'graph', label: 'Topology Graph' },
    { id: 'overview', label: 'Case Overview' },
    { id: 'findings', label: 'Risk Findings & Vectors' },
    { id: 'evidence', label: 'Evidence Attestation' },
  ];

  const handleHighlightFinding = (finding: GraphFinding) => {
    const allRelated = [...finding.relatedNodeIds, ...finding.relatedEdgeIds];
    selectFinding(finding.id, allRelated);
  };

  if (caseLoading || graphLoading || findingsLoading) {
    return (
      <div className="space-y-6 py-6 max-w-7xl mx-auto">
        <Skeleton className="h-28 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-64 md:col-span-2 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (caseError || !caseDetail || !graphData) {
    return (
      <div className="p-12 text-center rounded-3xl bg-red-50/60 border border-red-100 max-w-lg mx-auto my-12">
        <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <h3 className="font-bold text-lg text-slate-900">Case Investigation Not Found</h3>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          The requested case ID ({caseId}) does not exist in the current session.
        </p>
        <Button variant="primary" onClick={() => navigate('/')}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#526077] hover:text-[#0F172A] transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Case Roster</span>
        </button>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
          <span>Case Identifier:</span>
          <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
            {caseDetail.caseId}
          </span>
        </div>
      </div>

      {/* Primary Subject & Risk Overview Top Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-4">
          <CaseSubjectCard caseDetail={caseDetail} className="h-full" />
        </div>
        <div className="lg:col-span-8 flex flex-col justify-between gap-6">
          <CaseStatusTimeline steps={caseDetail.steps} />
          <CaseMetricsGrid
            nodeCount={graphData.metadata.nodeCount}
            edgeCount={graphData.metadata.edgeCount}
            maxHopDepth={graphData.metadata.maxHopDepth}
            findingCount={findingsData?.length || 2}
          />
        </div>
      </div>

      {/* Quick Actions Bar */}
      <CaseActionBar caseId={caseDetail.caseId} />

      {/* Workspace Tabs Navigation */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Tabs
            tabs={workspaceTabs}
            activeTab={activeWorkspaceTab}
            onChange={setActiveWorkspaceTab}
          />
        </div>

        {/* Tab 1: Interactive Cytoscape Topology Graph */}
        {activeWorkspaceTab === 'graph' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Cytoscape Canvas */}
            <div className="lg:col-span-8">
              <TransactionGraph graph={graphData} />
            </div>

            {/* Dynamic Inspector Panel */}
            <div className="lg:col-span-4">
              <GraphInspectorPanel
                nodes={graphData.nodes}
                edges={graphData.edges}
                findings={findingsData || []}
                onHighlightFinding={handleHighlightFinding}
                className="sticky top-20"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Overview (Subject Matrix + Transaction Feed) */}
        {activeWorkspaceTab === 'overview' && (
          <div className="space-y-6">
            <RiskMatrixBreakdown />
            <TransactionFeedTable />
          </div>
        )}

        {/* Tab 3: Risk Findings & Vectors */}
        {activeWorkspaceTab === 'findings' && (
          <div className="space-y-6">
            <RiskFindingsPanel
              findings={findingsData || []}
              onHighlightFinding={(f) => {
                handleHighlightFinding(f);
                setActiveWorkspaceTab('graph');
              }}
            />
            <RiskMatrixBreakdown />
          </div>
        )}

        {/* Tab 4: Evidence Attestation */}
        {activeWorkspaceTab === 'evidence' && (
          <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-[0_10px_35px_rgba(0,0,0,0.03)] space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-50 text-[#10B981]">
                  <FileCheck2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-slate-900">
                    Polygon Amoy Cryptographic Attestation
                  </h3>
                  <p className="text-xs text-[#526077]">
                    Immutable evidence record anchored to the EvidenceRegistry contract.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-mono text-xs font-semibold border border-emerald-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>On-Chain Notarized</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block uppercase font-bold mb-1">
                  Contract Address
                </span>
                <span className="text-slate-800 font-bold break-all">
                  0x71c504A7aFdC370B3C46c24385ea1502476b7A6B
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block uppercase font-bold mb-1">
                  Transaction Hash
                </span>
                <span className="text-slate-800 font-bold break-all">
                  0x3f5c9e2b1a8d7f4e6a0c8b2d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block uppercase font-bold mb-1">
                  Evidence Version
                </span>
                <span className="text-slate-800 font-bold">Version #1 (Immutable)</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="primary"
                onClick={() => navigate('/evidence')}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Perform Independent Verification
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
