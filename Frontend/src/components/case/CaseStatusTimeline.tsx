import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  CircleDashed,
  Database,
  Network,
  Cpu,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CaseSteps } from '@/types';

export type StepState =
  | 'pending'
  | 'running'
  | 'complete'
  | 'failed'
  | 'not_started'
  | 'generating'
  | 'ready'
  | 'storing'
  | 'stored';

export interface CaseStatusTimelineProps {
  steps: CaseSteps;
  className?: string;
}

export const CaseStatusTimeline: React.FC<CaseStatusTimelineProps> = ({
  steps,
  className,
}) => {
  const stepConfig: Array<{
    key: keyof CaseSteps;
    label: string;
    description: string;
    icon: React.ElementType;
  }> = [
    {
      key: 'ingestion',
      label: 'Ingestion',
      description: 'EVM transaction fetch',
      icon: Database,
    },
    {
      key: 'graph',
      label: 'Graph Build',
      description: 'Multi-hop topologies',
      icon: Network,
    },
    {
      key: 'analysis',
      label: 'Risk Analysis',
      description: 'AI & pattern detection',
      icon: Cpu,
    },
    {
      key: 'report',
      label: 'Report Ready',
      description: 'Forensic dossier PDF',
      icon: FileText,
    },
    {
      key: 'evidence',
      label: 'Proof Anchored',
      description: 'Polygon notary hash',
      icon: ShieldCheck,
    },
  ];

  const getStatusBadge = (status: StepState) => {
    switch (status) {
      case 'complete':
      case 'ready':
      case 'stored':
        return {
          icon: CheckCircle2,
          color: 'text-[#10B981] bg-emerald-50 border-emerald-200',
          text: 'Complete',
        };
      case 'running':
      case 'generating':
      case 'storing':
      case 'pending':
        return {
          icon: Clock,
          color: 'text-[#4F46E5] bg-indigo-50 border-indigo-200 animate-pulse',
          text: 'Processing',
        };
      case 'failed':
        return {
          icon: AlertCircle,
          color: 'text-[#EF4444] bg-red-50 border-red-200',
          text: 'Failed',
        };
      default:
        return {
          icon: CircleDashed,
          color: 'text-slate-400 bg-slate-50 border-slate-200',
          text: 'Pending',
        };
    }
  };

  return (
    <div
      className={cn(
        'p-6 rounded-3xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)]',
        className
      )}
    >
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
        <h3 className="font-display font-bold text-base text-[#0F172A] tracking-tight">
          Pipeline Execution Progress
        </h3>
        <span className="text-xs font-mono text-[#526077]">5-Stage Automated Workflow</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative">
        {stepConfig.map((item) => {
          const status = (steps[item.key] || 'not_started') as StepState;
          const info = getStatusBadge(status);
          const StepIcon = item.icon;

          return (
            <div
              key={item.key}
              className="flex flex-col p-4 rounded-2xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-colors relative"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-xl border ${info.color}`}>
                  <StepIcon className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-white border border-slate-200/80 text-slate-700 shadow-2xs">
                  {info.text}
                </span>
              </div>

              <span className="font-display font-bold text-sm text-[#0F172A]">
                {item.label}
              </span>
              <span className="text-[11px] text-[#94A3B8] mt-0.5">
                {item.description}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
