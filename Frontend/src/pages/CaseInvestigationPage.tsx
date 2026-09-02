import { useParams, useNavigate } from 'react-router-dom';
import { PageFrame } from '@/components/layout/PageFrame';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Network } from 'lucide-react';
import { shortenAddress } from '@/utils/address';
import { useCase } from '@/hooks/useCase';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';

export function CaseInvestigationPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { data: caseData, isLoading } = useCase(caseId);

  return (
    <PageFrame>
      <Button variant="ghost" onClick={() => navigate('/')} className="gap-2 mb-6 -ml-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Button>

      {/* Case header info */}
      {isLoading && (
        <div className="space-y-3 mb-6">
          <Skeleton className="h-6 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-28" />
          </div>
        </div>
      )}

      {caseData && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-bold text-cyber-text font-mono">
              {shortenAddress(caseData.rootAddress, 8)}
            </h2>
            <RiskBadge level={caseData.riskLevel} />
            <StatusBadge status={caseData.status} />
          </div>
          <p className="text-sm text-cyber-text-dim">
            Case ID: <code className="text-cyber-text-muted font-mono">{caseData.caseId}</code>
          </p>
        </div>
      )}

      <Card className="max-w-3xl border-cyber-cyan/10">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyber-cyan/10 border border-cyber-cyan/20 mb-4">
            <Network className="h-8 w-8 text-cyber-cyan" />
          </div>
          <h3 className="text-lg font-bold text-cyber-text mb-2">Investigation Workspace</h3>
          <p className="text-sm text-cyber-text-dim max-w-md">
            Interactive transaction graph, risk findings, wallet/transaction details, and suspicious path analysis.
          </p>
          <p className="text-xs text-cyber-amber mt-4 font-medium">
            🚧 Coming in Phase 3 — Graph & Risk Visualization
          </p>
        </CardContent>
      </Card>
    </PageFrame>
  );
}
