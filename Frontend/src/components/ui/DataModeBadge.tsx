import { dataMode } from '@/api';
import { cn } from '@/lib/utils';

interface DataModeBadgeProps {
  className?: string;
}

export function DataModeBadge({ className }: DataModeBadgeProps) {
  const isDemo = dataMode === 'mock';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wider uppercase',
        isDemo
          ? 'border-cyber-amber/30 bg-cyber-amber/10 text-cyber-amber'
          : 'border-cyber-green/30 bg-cyber-green/10 text-cyber-green',
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-75',
            isDemo ? 'bg-cyber-amber animate-pulse-glow' : 'bg-cyber-green animate-pulse-glow'
          )}
        />
        <span
          className={cn(
            'relative inline-flex h-2 w-2 rounded-full',
            isDemo ? 'bg-cyber-amber' : 'bg-cyber-green'
          )}
        />
      </span>
      {isDemo ? 'Demo Mode' : 'Live'}
    </span>
  );
}
