import { useNavigate } from 'react-router-dom';
import type { CaseSummary } from '@/types';
import { Card } from '@/components/ui/card';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { shortenAddress } from '@/utils/address';
import { formatDate } from '@/utils/formatters';
import { getChainName, getRiskColor } from '@/utils/risk';
import { cn } from '@/lib/utils';
import { ExternalLink, Clock } from 'lucide-react';

interface CaseSummaryCardProps {
  caseData: CaseSummary;
  index?: number;
}

export function CaseSummaryCard({ caseData, index = 0 }: CaseSummaryCardProps) {
  const navigate = useNavigate();

  const riskPercent = Math.min(caseData.riskScore, 100);
  const circumference = 2 * Math.PI * 36;
  const dashOffset = circumference - (riskPercent / 100) * circumference;

  return (
    <Card
      onClick={() => navigate(`/cases/${caseData.caseId}`)}
      className={cn(
        'group relative cursor-pointer overflow-hidden hover:border-cyber-cyan/30 hover:shadow-[0_0_20px_rgba(0,240,255,0.08)] animate-slide-up',
      )}
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'backwards' }}
    >
      {/* Top risk accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-60"
        style={{ backgroundColor: getRiskColor(caseData.riskLevel) }}
      />

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Address + Meta */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono text-cyber-text group-hover:text-cyber-cyan transition-colors truncate">
                {shortenAddress(caseData.rootAddress, 6)}
              </code>
              <ExternalLink className="h-3 w-3 text-cyber-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <RiskBadge level={caseData.riskLevel} />
              <StatusBadge status={caseData.status} />
              <span className="inline-flex items-center gap-1 rounded-md border border-cyber-border bg-cyber-surface-2 px-2 py-0.5 text-[10px] font-medium text-cyber-text-muted">
                {getChainName(caseData.chainId)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-cyber-text-muted">
              <Clock className="h-3 w-3" />
              {formatDate(caseData.createdAt)}
            </div>
          </div>

          {/* Right: Risk Score Ring */}
          <div className="risk-ring shrink-0">
            <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
              {/* Background ring */}
              <circle
                cx="40" cy="40" r="36"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-cyber-surface-3"
              />
              {/* Progress ring */}
              <circle
                cx="40" cy="40" r="36"
                fill="none"
                stroke={getRiskColor(caseData.riskLevel)}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="transition-[stroke-dashoffset] duration-1000 ease-out"
                style={{ filter: `drop-shadow(0 0 4px ${getRiskColor(caseData.riskLevel)}66)` }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-cyber-text">{caseData.riskScore}</span>
              <span className="text-[9px] text-cyber-text-muted uppercase tracking-wider">Risk</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
