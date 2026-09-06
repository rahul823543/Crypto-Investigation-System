import React from 'react';

export const GraphLegend: React.FC<{ className?: string }> = ({ className }) => {
  const nodeLegend = [
    { label: 'Root Subject', color: 'bg-indigo-600 ring-2 ring-indigo-300', shape: 'rounded-full' },
    { label: 'DEX Router', color: 'bg-purple-600', shape: 'rounded-md' },
    { label: 'Bridge Relay', color: 'bg-emerald-600', shape: 'rotate-45 rounded-sm' },
    { label: 'Flagged / Mixer', color: 'bg-red-600', shape: 'rounded-sm' },
  ];

  const edgeLegend = [
    { label: 'High Threat Flow', color: 'bg-red-500' },
    { label: 'Medium Threat Flow', color: 'bg-amber-500' },
    { label: 'Standard Transfer', color: 'bg-emerald-500' },
  ];

  return (
    <div
      className={`p-3 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-4 text-xs font-mono ${className}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase font-bold text-slate-400">Nodes:</span>
        {nodeLegend.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 shrink-0 ${item.color} ${item.shape}`} />
            <span className="text-slate-700">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="w-px h-4 bg-slate-200 hidden sm:block" />

      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase font-bold text-slate-400">Edges:</span>
        {edgeLegend.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className={`w-3 h-1 shrink-0 rounded-full ${item.color}`} />
            <span className="text-slate-700">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
