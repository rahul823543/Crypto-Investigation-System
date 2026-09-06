import React from 'react';
import { TrendingUp, Activity, ShieldAlert, FileCheck2 } from 'lucide-react';

export const MetricCards: React.FC = () => {
  const metrics = [
    {
      label: 'Active Triage Cases',
      value: '42',
      trend: '+12% vs last cycle',
      trendIcon: TrendingUp,
      trendColor: 'text-[#10B981]',
      icon: Activity,
      iconColor: 'text-[#4F46E5] bg-indigo-50',
    },
    {
      label: 'Monitored Volume',
      value: '$148.9M',
      subtext: 'Real-time EVM Mempool',
      trendColor: 'text-[#526077]',
      icon: TrendingUp,
      iconColor: 'text-[#7E22CE] bg-purple-50',
    },
    {
      label: 'High-Risk Clusters',
      value: '18',
      trend: 'Mixers & Sandwiches',
      trendIcon: ShieldAlert,
      trendColor: 'text-[#EF4444]',
      valueColor: 'text-[#EF4444]',
      icon: ShieldAlert,
      iconColor: 'text-[#EF4444] bg-red-50',
    },
    {
      label: 'Proof Anchors',
      value: '100%',
      trend: 'SHA-256 Merkle Signatures',
      trendIcon: FileCheck2,
      trendColor: 'text-[#4F46E5]',
      valueColor: 'text-[#4F46E5]',
      icon: FileCheck2,
      iconColor: 'text-[#10B981] bg-emerald-50',
    },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 my-8">
      {metrics.map((metric) => {
        const TrendIcon = metric.trendIcon;
        const Icon = metric.icon;

        return (
          <div
            key={metric.label}
            className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:border-purple-200 transition-all duration-200 flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#526077] uppercase tracking-wider">
                {metric.label}
              </span>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${metric.iconColor} transition-transform group-hover:scale-110`}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div
              className={`font-display font-extrabold text-3xl sm:text-4xl leading-none mb-3 ${
                metric.valueColor || 'text-[#0F172A]'
              }`}
            >
              {metric.value}
            </div>

            <div className="flex items-center gap-1 text-xs font-medium">
              {TrendIcon && <TrendIcon className={`h-3.5 w-3.5 ${metric.trendColor}`} />}
              <span className={metric.trendColor}>
                {metric.trend || metric.subtext}
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
};
