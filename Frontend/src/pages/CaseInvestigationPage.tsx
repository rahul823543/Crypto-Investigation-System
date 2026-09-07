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
import { SuspiciousPathsPanel } from '@/components/case/SuspiciousPathsPanel';
import { AttributionPanel } from '@/components/case/AttributionPanel';
import { EvidenceStatusPanel } from '@/components/evidence/EvidenceStatusPanel';
import { TransactionGraph } from '@/components/graph/TransactionGraph';
import { GraphInspectorPanel } from '@/components/graph/GraphInspectorPanel';
import { RiskFindingsPanel } from '@/components/graph/RiskFindingsPanel';
import { useCasePolling } from '@/hooks/useCasePolling';
import { useCaseGraph } from '@/hooks/useCaseGraph';
import { useCaseFindings } from '@/hooks/useCaseFindings';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useAttribution } from '@/hooks/useAttribution';
import { useEvidence } from '@/hooks/useEvidence';
import { useInvestigationStore } from '@/store/investigationStore';
import { useUiStore } from '@/store/uiStore';
import type { GraphFinding } from '@/types';

export const CaseInvestigationPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { setActiveChainId } = useUiStore();

  const { data: caseDetail, isLoading: caseLoading, isError: caseError } = useCasePolling(caseId);
  const { data: graphData, isLoading: graphLoading } = useCaseGraph(caseId);
  const { data: findingsData, isLoading: findingsLoading } = useCaseFindings(caseId);
  const { data: analysisData, isLoading: analysisLoading } = useAnalysis(caseId);
  const { data: attributionData, isLoading: attributionLoading } = useAttribution(caseId);
  const {
    data: evidenceData,
    isLoading: evidenceLoading,
    isError: evidenceError,
    refetch: refetchEvidence,
  } = useEvidence(caseId);

  const { selectFinding } = useInvestigationStore();
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('graph');

  React.useEffect(() => {
    if (caseDetail?.chainId) {
      setActiveChainId(caseDetail.chainId);
    }
  }, [caseDetail?.chainId, setActiveChainId]);

  const totalFindingsCount =
    (findingsData?.length || 0) + (analysisData?.findings?.length || 0);

  const totalPathsAndLoops =
    (analysisData?.suspiciousPaths?.length || 0) +
    (analysisData?.circularFlows?.length || 0);

  const workspaceTabs = [
    { id: 'graph', label: 'Topology Graph' },
    {
      id: 'analysis',
      label: `Analysis & Paths ${totalPathsAndLoops > 0 ? `(${totalPathsAndLoops})` : ''}`,
    },
    {
      id: 'findings',
      label: `Risk Findings ${totalFindingsCount > 0 ? `(${totalFindingsCount})` : ''}`,
    },
    { id: 'overview', label: 'Case Overview' },
    { id: 'evidence', label: 'Evidence Attestation' },
  ];

  const handleHighlightFinding = (finding: GraphFinding) => {
    const allRelated = [...finding.relatedNodeIds, ...finding.relatedEdgeIds];
    selectFinding(finding.id, allRelated);
  };

  const handleHighlightPath = (nodeIds: string[], edgeIds: string[]) => {
    selectFinding('custom-path-highlight', [...nodeIds, ...edgeIds]);
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
        onAnalysisTriggered={() => setActiveWorkspaceTab('analysis')}
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

        {/* Tab 2: Analysis & Paths (Suspicious Paths, Circular Flows, VASP Attribution) */}
        {activeWorkspaceTab === 'analysis' && (
          <div className="space-y-6">
            <AttributionPanel
              attribution={attributionData ?? analysisData?.vaspAttribution}
              isLoading={attributionLoading || analysisLoading}
              onHighlightPath={handleHighlightPath}
            />

            <SuspiciousPathsPanel
              paths={analysisData?.suspiciousPaths || []}
              circularFlows={analysisData?.circularFlows || []}
              isLoading={analysisLoading}
              onHighlightPath={handleHighlightPath}
            />
          </div>
        )}

        {/* Tab 3: Risk Findings & Vectors */}
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

        {/* Tab 5: Evidence Attestation */}
        {activeWorkspaceTab === 'evidence' && (
          <EvidenceStatusPanel
            evidence={evidenceData}
            isLoading={evidenceLoading}
            isError={evidenceError}
            onRetry={() => refetchEvidence()}
          />
        )}
      </div>
    </div>
  );
};
