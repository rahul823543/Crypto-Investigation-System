import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Copy,
  Check,
  Network,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RiskBadge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { CaseStatusTimeline } from '@/components/case/CaseStatusTimeline';
import { RiskScoreGauge } from '@/components/case/RiskScoreGauge';
import { useCase } from '@/hooks/useCase';

export const CaseInvestigationPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { data: caseDetail, isLoading, isError } = useCase(caseId);
  const [copied, setCopied] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('overview');

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const workspaceTabs = [
    { id: 'overview', label: 'Case Overview' },
    { id: 'graph', label: 'Topology Graph (Phase 3)' },
    { id: 'findings', label: 'Risk Findings & Paths' },
    { id: 'evidence', label: 'Evidence & Notary' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 py-6 max-w-6xl mx-auto">
        <Skeleton className="h-28 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-64 md:col-span-2 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (isError || !caseDetail) {
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
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Top Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-[0_10px_35px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          {/* Back Navigation */}
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#526077] hover:text-[#0F172A] mb-3 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#0F172A] tracking-tight">
              Case {caseDetail.caseId}
            </h1>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60 uppercase">
              {caseDetail.mode} Mode
            </span>
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Chain #{caseDetail.chainId} (Polygon Amoy)
            </span>
          </div>

          {/* Root Address Bar */}
          <div className="flex items-center gap-2 mt-3 text-xs sm:text-sm font-mono text-[#526077]">
            <span className="font-semibold text-slate-700">Root Subject:</span>
            <span className="text-[#0F172A] font-bold bg-slate-100/80 px-2 py-0.5 rounded-md">
              {caseDetail.rootAddress}
            </span>
            <button
              onClick={() => copyAddress(caseDetail.rootAddress)}
              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors"
              title="Copy root address"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/evidence')}
            leftIcon={<ShieldCheck className="h-4 w-4 text-[#10B981]" />}
          >
            Verify Evidence
          </Button>
        </div>
      </div>

      {/* Threat Score + Pipeline Timeline Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
          <RiskScoreGauge
            score={caseDetail.riskScore}
            level={caseDetail.riskLevel}
            className="h-full"
          />
        </div>
        <div className="lg:col-span-8">
          <CaseStatusTimeline steps={caseDetail.steps} className="h-full" />
        </div>
      </div>

      {/* Workspace Section */}
      <div className="rounded-3xl bg-white border border-slate-200/80 shadow-[0_10px_35px_rgba(0,0,0,0.03)] p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <Tabs
            tabs={workspaceTabs}
            activeTab={activeWorkspaceTab}
            onChange={setActiveWorkspaceTab}
          />
        </div>

        {/* Workspace Tab 1: Overview */}
        {activeWorkspaceTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-100">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#7E22CE] uppercase mb-1">
                  <Network className="h-4 w-4" />
                  <span>Graph Topology</span>
                </div>
                <div className="font-display font-bold text-2xl text-slate-900 mt-2">
                  6 Nodes • 5 Edges
                </div>
                <p className="text-xs text-[#526077] mt-1">
                  2-Hop Fan-out topology through QuickSwap Router & Hop Bridge.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-red-50/50 border border-red-100">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-red-700 uppercase mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Risk Findings</span>
                </div>
                <div className="font-display font-bold text-2xl text-red-700 mt-2">
                  2 Flagged Patterns
                </div>
                <p className="text-xs text-[#526077] mt-1">
                  Rapid fan-out (7 min) and high-volume DEX obfuscation detected.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-700 uppercase mb-1">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Evidence Proof</span>
                </div>
                <div className="font-display font-bold text-2xl text-emerald-700 mt-2">
                  Polygon Notarized
                </div>
                <p className="text-xs text-[#526077] mt-1">
                  SHA-256 Merkle hash anchored to contract on Amoy testnet.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
              <h4 className="font-display font-bold text-base text-slate-900 mb-2">
                Executive Case Summary
              </h4>
              <p className="text-xs sm:text-sm text-[#526077] leading-relaxed">
                Subject wallet{' '}
                <span className="font-mono font-semibold text-slate-800">
                  {caseDetail.rootAddress}
                </span>{' '}
                exhibits high-velocity disbursement of USDC across 4 recipient addresses within a 7-minute window. A significant tranche was subsequently routed through a decentralized liquidity pool (QuickSwap V2) and an external bridge contract to sever standard attribution linkages.
              </p>
            </div>
          </div>
        )}

        {/* Workspace Tab 2: Graph Explorer Placeholder for Phase 3 */}
        {activeWorkspaceTab === 'graph' && (
          <div className="p-12 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#4F46E5] flex items-center justify-center mx-auto">
              <Network className="h-6 w-6" />
            </div>
            <h4 className="font-display font-bold text-base text-slate-900">
              Interactive Cytoscape Graph Canvas
            </h4>
            <p className="text-xs text-[#526077] max-w-md mx-auto">
              In Phase 3, this canvas will render interactive multi-hop Cytoscape nodes with real-time risk color coding, edge weighting by USD volume, and inspector detail panels.
            </p>
          </div>
        )}

        {/* Workspace Tab 3: Risk Findings */}
        {activeWorkspaceTab === 'findings' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-red-50/70 border border-red-100 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-red-900">
                    High Velocity Fan-Out Transfer
                  </span>
                  <RiskBadge riskLevel="high" size="sm" />
                </div>
                <p className="text-xs text-red-700 mt-1">
                  Root wallet dispatched funds to 4 distinct recipient addresses in under 7 minutes.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 flex items-start gap-3">
              <Cpu className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-amber-900">
                    DEX Router Obfuscation (QuickSwap V2)
                  </span>
                  <RiskBadge riskLevel="medium" size="sm" />
                </div>
                <p className="text-xs text-amber-700 mt-1">
                  5,000 USDC swapped to intermediary tokens through known DEX contract.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Workspace Tab 4: Evidence & Notary */}
        {activeWorkspaceTab === 'evidence' && (
          <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <span>Polygon Amoy Notarized Proof</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-xs font-semibold">
                Verified On-Chain
              </span>
            </div>
            <div className="font-mono text-xs text-slate-700 bg-white p-3 rounded-xl border border-emerald-200">
              SHA-256 Digest: 0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/evidence')}
              rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
            >
              Run Independent Hash Verification
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
