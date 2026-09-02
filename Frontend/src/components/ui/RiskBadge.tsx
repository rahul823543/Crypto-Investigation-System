import type { RiskLevel } from '@/types';
import { cn } from '@/lib/utils';
import { getRiskLabel } from '@/utils/risk';
import { Shield, ShieldAlert, ShieldX, ShieldCheck } from 'lucide-react';

interface RiskBadgeProps {
  level: RiskLevel;
  showIcon?: boolean;
  className?: string;
}

const riskConfig: Record<RiskLevel, { classes: string; Icon: typeof Shield }> = {
  low: {
    classes: 'border-green-500/30 bg-green-500/10 text-green-400',
    Icon: ShieldCheck,
  },
  medium: {
    classes: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    Icon: Shield,
  },
  high: {
    classes: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
    Icon: ShieldAlert,
  },
  critical: {
    classes: 'border-red-500/30 bg-red-500/10 text-red-400',
    Icon: ShieldX,
  },
};

export function RiskBadge({ level, showIcon = true, className }: RiskBadgeProps) {
  const config = riskConfig[level] ?? riskConfig.low;
  const { Icon } = config;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-semibold',
        config.classes,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {getRiskLabel(level)}
    </span>
  );
}
