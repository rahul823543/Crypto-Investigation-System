import type { CaseStatus } from '@/types';
import { cn } from '@/lib/utils';
import { getStatusClasses } from '@/utils/risk';

interface StatusBadgeProps {
  status: CaseStatus | string;
  className?: string;
}

const statusLabels: Record<string, string> = {
  created: 'Created',
  ingesting: 'Ingesting',
  ingested: 'Ingested',
  graph_building: 'Building Graph',
  graph_ready: 'Graph Ready',
  analyzing: 'Analyzing',
  analyzed: 'Analyzed',
  analysis_complete: 'Analysis Complete',
  report_generating: 'Generating Report',
  report_ready: 'Report Ready',
  evidence_storing: 'Storing Evidence',
  completed: 'Completed',
  failed: 'Failed',
  demo_fallback_used: 'Demo Mode',
  // Step statuses
  pending: 'Pending',
  running: 'Running',
  complete: 'Complete',
  not_started: 'Not Started',
  generating: 'Generating',
  ready: 'Ready',
  storing: 'Storing',
  stored: 'Stored',
};

function isActiveStatus(status: string): boolean {
  return ['ingesting', 'analyzing', 'graph_building', 'report_generating', 'evidence_storing', 'running', 'generating', 'storing'].includes(status);
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-semibold',
        getStatusClasses(status),
        className
      )}
    >
      {isActiveStatus(status) && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
        </span>
      )}
      {statusLabels[status] ?? status}
    </span>
  );
}
