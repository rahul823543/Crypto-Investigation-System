import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-cyber-border bg-cyber-surface-2 text-cyber-text-dim',
        cyan: 'border-cyber-cyan/30 bg-cyber-cyan/10 text-cyber-cyan',
        green: 'border-green-500/30 bg-green-500/10 text-green-400',
        amber: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
        orange: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
        red: 'border-red-500/30 bg-red-500/10 text-red-400',
        purple: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
