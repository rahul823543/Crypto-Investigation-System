import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
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
import { SuspiciousPathPanel } from '@/components/analysis/SuspiciousPathPanel';
import { CircularFlowPanel } from '@/components/analysis/CircularFlowPanel';
import { ReportHashPanel } from '@/components/report/ReportHashPanel';
import { EvidenceStatusPanel } from '@/components/evidence/EvidenceStatusPanel';
import { useCasePolling } from '@/hooks/useCasePolling';
import { useCaseGraph } from '@/hooks/useCaseGraph';
import { useCaseFindings } from '@/hooks/useCaseFindings';
import { useCaseAnalysis } from '@/hooks/useCaseAnalysis';
import { useInvestigationStore } from '@/store/investigationStore';
import type { GraphFinding, SuspiciousPath, CircularFlow } from '@/types';

export const CaseInvestigationPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  const { data: caseDetail, isLoading: caseLoading, isError: caseError } = useCasePolling(caseId);
  const { data: graphData, isLoading: graphLoading } = useCaseGraph(caseId);
  const { data: findingsData, isLoading: findingsLoading } = useCaseFindings(caseId);
  const { data: analysisData } = useCaseAnalysis(caseId);

  const { selectFinding, selectPath, selectCircularFlow } = useInvestigationStore();
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('graph');

  // Compute combined finding count
  const totalFindingsCount =
    (findingsData?.length || 0) + (analysisData?.findings?.length || 0);

  // Compute total paths and loops
  const totalPathsAndLoops =
    (analysisData?.suspiciousPaths?.length || 0) +
    (analysisData?.circularFlows?.length || 0);

  const workspaceTabs = [
    { id: 'graph', label: 'Topology Graph' },
    {
      id: 'paths',
      label: `Suspicious Paths & Loops ${totalPathsAndLoops > 0 ? `(${totalPathsAndLoops})` : ''}`,
    },
    {
      id: 'findings',
      label: `Risk Findings & Vectors ${totalFindingsCount > 0 ? `(${totalFindingsCount})` : ''}`,
    },
    { id: 'overview', label: 'Case Overview' },
    { id: 'reports', label: 'Forensic Dossier & Hash' },
    { id: 'evidence', label: 'Evidence Attestation' },
  ];

  const handleHighlightFinding = (finding: GraphFinding) => {
    const allRelated = [...finding.relatedNodeIds, ...finding.relatedEdgeIds];
    selectFinding(finding.id, allRelated);
  };

  const handleSelectPath = (path: SuspiciousPath) => {
    const allIds = [...path.nodeIds, ...path.edgeIds];
    selectPath(path.id, allIds);
    setActiveWorkspaceTab('graph');
  };

  const handleSelectFlow = (flow: CircularFlow) => {
    const allIds = [...flow.nodeIds, ...flow.edgeIds];
    selectCircularFlow(flow.id, allIds);
    setActiveWorkspaceTab('graph');
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
            findingCount={totalFindingsCount || 2}
          />
        </div>
      </div>

      {/* Quick Actions Bar */}
      <CaseActionBar
        caseId={caseDetail.caseId}
        onTabChange={(tab) => setActiveWorkspaceTab(tab)}
      />

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
                paths={analysisData?.suspiciousPaths || []}
                circularFlows={analysisData?.circularFlows || []}
                onHighlightFinding={handleHighlightFinding}
                className="sticky top-20"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Suspicious Paths & Circular Flows */}
        {activeWorkspaceTab === 'paths' && (
          <div className="space-y-8">
            <SuspiciousPathPanel
              paths={analysisData?.suspiciousPaths || []}
              onSelectPath={handleSelectPath}
            />

            <CircularFlowPanel
              circularFlows={analysisData?.circularFlows || []}
              onSelectFlow={handleSelectFlow}
            />
          </div>
        )}

        {/* Tab 3: Unified Risk Findings & Vectors */}
        {activeWorkspaceTab === 'findings' && (
          <div className="space-y-6">
            <RiskFindingsPanel
              findings={findingsData || []}
              advancedFindings={analysisData?.findings || []}
              onHighlightFinding={(f) => {
                handleHighlightFinding(f);
                setActiveWorkspaceTab('graph');
              }}
            />
            <RiskMatrixBreakdown />
          </div>
        )}

        {/* Tab 4: Overview (Subject Matrix + Transaction Feed) */}
        {activeWorkspaceTab === 'overview' && (
          <div className="space-y-6">
            <RiskMatrixBreakdown />
            <TransactionFeedTable />
          </div>
        )}

        {/* Tab 5: Forensic Report & Cryptographic Hash */}
        {activeWorkspaceTab === 'reports' && (
          <ReportHashPanel
            caseId={caseDetail.caseId}
            onSelectReportForVerification={(reportId) =>
              navigate(`/evidence?caseId=${caseDetail.caseId}&reportId=${reportId}`)
            }
          />
        )}

        {/* Tab 6: Evidence Attestation */}
        {activeWorkspaceTab === 'evidence' && (
          <EvidenceStatusPanel caseId={caseDetail.caseId} />
        )}
      </div>
    </div>
  );
};
