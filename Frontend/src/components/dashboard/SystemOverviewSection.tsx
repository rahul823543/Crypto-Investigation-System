import React from 'react';
import {
  Network,
  Cpu,
  FileCheck2,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const SystemOverviewSection: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Decentralized Ingestion & Multi-Hop Graph',
      description:
        'Fastify ingestion workers fetch EVM transfer traces, bridge hops, and DEX swap calls up to 3 recursive depth layers, forming a directed topological graph with stable deterministic identifiers.',
      icon: Network,
      tag: 'Fastify / Redis',
      color: 'text-[#4F46E5] bg-indigo-50 border-indigo-100',
    },
    {
      step: '02',
      title: 'Python Intelligence & Heuristic Scoring',
      description:
        'The FastAPI intelligence engine evaluates graph topology for rapid fan-outs, mixing pools, wash loops, circular paths, and known OFAC sanctions, generating human-readable findings and risk scores.',
      icon: Cpu,
      tag: 'FastAPI / Heuristics',
      color: 'text-[#7E22CE] bg-purple-50 border-purple-100',
    },
    {
      step: '03',
      title: 'Polygon Proof & Evidence Registry',
      description:
        'Finalized PDF investigation packages have their cryptographic SHA-256 Merkle hashes anchored immutably to the EvidenceRegistry smart contract on Polygon Amoy, providing courtroom-admissible non-repudiation.',
      icon: FileCheck2,
      tag: 'Polygon Amoy / Solidity',
      color: 'text-[#10B981] bg-emerald-50 border-emerald-100',
    },
  ];

  return (
    <section className="my-16">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-mono text-xs font-semibold mb-3">
          <Layers className="h-3.5 w-3.5" />
          <span>Forensic Pipeline Architecture</span>
        </div>
        <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#0F172A] tracking-tight">
          How the On-Chain Forensic Triage Engine Works
        </h2>
        <p className="text-xs sm:text-sm text-[#526077] mt-2">
          An automated 3-tier intelligence pipeline designed specifically for blockchain investigators and law enforcement.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.step}
              className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:border-purple-200 transition-all duration-200 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono font-extrabold text-2xl text-slate-300 group-hover:text-indigo-400 transition-colors">
                    {item.step}
                  </span>
                  <div
                    className={`p-2.5 rounded-2xl border ${item.color} flex items-center justify-center`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <div className="mb-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-[#94A3B8] tracking-wider">
                    {item.tag}
                  </span>
                  <h3 className="font-display font-bold text-base text-[#0F172A] mt-1">
                    {item.title}
                  </h3>
                </div>

                <p className="text-xs sm:text-sm text-[#526077] leading-relaxed mt-2">
                  {item.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#4F46E5]">
                <span>Pipeline Stage Verified</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
