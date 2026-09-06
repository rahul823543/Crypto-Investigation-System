import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import type { RiskLevel } from '@/types';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full font-medium transition-colors select-none',
  {
    variants: {
      variant: {
        default: 'bg-slate-100 text-slate-700 border border-slate-200/60',
        primary: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
        secondary: 'bg-purple-50 text-purple-700 border border-purple-200/60',
        success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/70',
        warning: 'bg-amber-50 text-amber-700 border border-amber-200/70',
        danger: 'bg-red-50 text-red-700 border border-red-200/70',
        critical: 'bg-rose-100 text-rose-800 border border-rose-300 font-semibold',
        purple: 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200/70',
        cyan: 'bg-sky-50 text-sky-700 border border-sky-200/70',
      },
      size: {
        sm: 'px-2 py-0.5 text-[10px] leading-tight font-mono',
        md: 'px-2.5 py-1 text-xs',
        lg: 'px-3 py-1.5 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dotColor?: string;
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant,
  size,
  dotColor,
  pulse = false,
  children,
  ...props
}) => {
  return (
    <span className={cn(badgeVariants({ variant, size, className }))} {...props}>
      {dotColor && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            dotColor,
            pulse && 'animate-pulse'
          )}
        />
      )}
      {children}
    </span>
  );
};

export const RiskBadge: React.FC<{
  riskLevel: RiskLevel;
  score?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ riskLevel, score, className, size = 'md' }) => {
  const map: Record<RiskLevel, { variant: VariantProps<typeof badgeVariants>['variant']; dot: string; label: string }> = {
    low: { variant: 'success', dot: 'bg-emerald-500', label: 'Low Risk' },
    medium: { variant: 'warning', dot: 'bg-amber-500', label: 'Medium Risk' },
    high: { variant: 'danger', dot: 'bg-red-500', label: 'High Risk' },
    critical: { variant: 'critical', dot: 'bg-rose-600', label: 'Critical Risk' },
  };

  const item = map[riskLevel] || map.low;

  return (
    <Badge
      variant={item.variant}
      size={size}
      dotColor={item.dot}
      className={className}
    >
      <span>{item.label}</span>
      {score !== undefined && (
        <span className="font-mono font-semibold ml-0.5">({score})</span>
      )}
    </Badge>
  );
};
