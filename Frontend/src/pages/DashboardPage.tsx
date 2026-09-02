import { useNavigate } from 'react-router-dom';
import { useCases } from '@/hooks/useCases';
import { PageFrame } from '@/components/layout/PageFrame';
import { CaseSummaryCard } from '@/components/investigation/CaseSummaryCard';
import { DemoCaseButton } from '@/components/investigation/DemoCaseButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FolderSearch,
  Plus,
  AlertTriangle,
  RefreshCw,
  Activity,
  ShieldAlert,
  TrendingUp,
  Briefcase,
} from 'lucide-react';
import type { CaseSummary } from '@/types';

export function DashboardPage() {
  const { data: cases, isLoading, error, refetch } = useCases();
  const navigate = useNavigate();

  return (
    <PageFrame>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-cyber-text">Investigations</h2>
          <p className="text-sm text-cyber-text-dim mt-1">
            Monitor and manage cryptocurrency forensic investigations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DemoCaseButton />
          <Button variant="primary" onClick={() => navigate('/cases/new')} className="gap-2">
            <Plus className="h-4 w-4" />
            New Investigation
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      {!isLoading && cases && <MetricsRow cases={cases} />}
      {isLoading && <MetricsSkeleton />}

      {/* Case List */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold text-cyber-text-dim uppercase tracking-wider mb-4">
          Recent Cases
        </h3>

        {isLoading && <CaseListSkeleton />}

        {error && (
          <Card className="border-red-500/20">
            <CardContent className="flex items-center gap-4 p-6">
              <AlertTriangle className="h-5 w-5 text-cyber-red shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-cyber-text">Failed to load cases</p>
                <p className="text-xs text-cyber-text-muted mt-0.5">{error.message}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry
                </Button>
                <DemoCaseButton />
              </div>
            </CardContent>
          </Card>
        )}

        {cases && cases.length === 0 && <EmptyState />}

        {cases && cases.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cases.map((c, i) => (
              <CaseSummaryCard key={c.caseId} caseData={c} index={i} />
            ))}
          </div>
        )}
      </div>
    </PageFrame>
  );
}

/* ─── Metrics Row ─────────────────────────────────────────────────────────── */

function MetricsRow({ cases }: { cases: CaseSummary[] }) {
  const total = cases.length;
  const active = cases.filter((c) =>
    ['ingesting', 'graph_building', 'analyzing', 'report_generating', 'evidence_storing'].includes(c.status)
  ).length;
  const highRisk = cases.filter((c) => c.riskLevel === 'high' || c.riskLevel === 'critical').length;
  const avgRisk = total > 0 ? Math.round(cases.reduce((acc, c) => acc + c.riskScore, 0) / total) : 0;

  const metrics = [
    { label: 'Total Cases', value: total, icon: Briefcase, color: 'text-cyber-cyan' },
    { label: 'Active', value: active, icon: Activity, color: 'text-cyber-green' },
    { label: 'High Risk', value: highRisk, icon: ShieldAlert, color: 'text-cyber-orange' },
    { label: 'Avg Risk Score', value: avgRisk, icon: TrendingUp, color: 'text-cyber-amber' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m, i) => (
        <Card
          key={m.label}
          className="animate-slide-up"
          style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'backwards' }}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-cyber-text-muted uppercase tracking-wider">{m.label}</p>
                <p className={`text-2xl font-bold mt-1 ${m.color}`}>{m.value}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyber-surface-2 border border-cyber-border">
                <m.icon className={`h-5 w-5 ${m.color} opacity-70`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ─── Skeleton States ─────────────────────────────────────────────────────── */

function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <Skeleton className="h-3 w-20 mb-3" />
            <Skeleton className="h-7 w-12" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CaseListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5 space-y-4">
            <Skeleton className="h-4 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-3 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ─── Empty State ─────────────────────────────────────────────────────────── */

function EmptyState() {
  const navigate = useNavigate();

  return (
    <Card className="border-dashed border-cyber-border">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyber-surface-2 border border-cyber-border mb-4">
          <FolderSearch className="h-8 w-8 text-cyber-text-muted" />
        </div>
        <h3 className="text-lg font-semibold text-cyber-text mb-1">No investigations yet</h3>
        <p className="text-sm text-cyber-text-dim max-w-sm mb-6">
          Start your first investigation by entering an EVM wallet address, or explore the seeded demo case.
        </p>
        <div className="flex items-center gap-3">
          <DemoCaseButton />
          <Button variant="primary" onClick={() => navigate('/cases/new')} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Investigation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
