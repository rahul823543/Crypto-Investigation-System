import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileCheck2,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiStore, SUPPORTED_CHAINS } from '@/store/uiStore';
import { useCases } from '@/hooks/useCases';

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar, activeChainId } = useUiStore();
  const location = useLocation();
  const { data: casesData } = useCases();

  const recentCases = (casesData || []).slice(0, 4);
  const currentChain = SUPPORTED_CHAINS[activeChainId] || {
    name: `Chain #${activeChainId}`,
    id: activeChainId,
    native: 'ETH',
  };

  const navItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: 'Home',
    },
    {
      to: '/create',
      label: 'New Triage',
      icon: PlusCircle,
      badge: 'EVM',
    },
    {
      to: '/evidence',
      label: 'Evidence Notary',
      icon: FileCheck2,
      badge: 'EIP-712',
    },
  ];

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 bottom-0 z-40 bg-white/95 backdrop-blur-xl border-r border-slate-200/80 transition-all duration-300 ease-in-out flex flex-col justify-between shadow-[4px_0_24px_rgba(0,0,0,0.02)]',
        sidebarCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-md shadow-indigo-500/15 border border-slate-200/80 group-hover:scale-105 transition-transform shrink-0 bg-white">
            <img
              src="/blockchain.jpg"
              alt="Forensic Triage Engine Logo"
              className="w-full h-full object-cover"
            />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-display font-extrabold text-[15px] tracking-tight text-[#0F172A] leading-tight">
                  Forensic Triage
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-purple-50 text-[#7E22CE] border border-purple-200/60 leading-none">
                  v3.4
                </span>
              </div>
              <span className="text-[10px] text-[#526077] font-medium tracking-wide">
                On-Chain Forensics
              </span>
            </div>
          )}
        </NavLink>

        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-xl hover:bg-slate-100 text-[#526077] transition-colors cursor-pointer"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2">
          {!sidebarCollapsed && (
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#94A3B8] font-bold">
              Investigations
            </p>
          )}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-medium transition-all group relative',
                isActive
                  ? 'bg-purple-50 text-[#7E22CE] font-semibold shadow-xs'
                  : 'text-[#526077] hover:bg-slate-50 hover:text-[#0F172A]'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0 transition-colors',
                  isActive
                    ? 'text-[#7E22CE]'
                    : 'text-[#526077] group-hover:text-[#0F172A]'
                )}
              />
              {!sidebarCollapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={cn(
                        'text-[10px] font-mono px-1.5 py-0.5 rounded-full border leading-none',
                        isActive
                          ? 'bg-purple-100/70 text-[#7E22CE] border-purple-200'
                          : 'bg-slate-100 text-[#526077] border-slate-200'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#4F46E5] rounded-r-full" />
              )}
            </NavLink>
          );
        })}

        {/* Recent Cases Section (Replacing Quick Demo) */}
        {recentCases.length > 0 && (
          <div className="pt-5">
            {!sidebarCollapsed && (
              <div className="px-3 pb-2 flex items-center justify-between">
                <p className="text-[10px] font-mono uppercase tracking-widest text-[#94A3B8] font-bold">
                  Recent Cases
                </p>
                <History className="h-3 w-3 text-slate-400" />
              </div>
            )}
            <div className="space-y-1">
              {recentCases.map((c) => {
                const isSeeded = c.mode === 'demo';
                const isCurrent = location.pathname === `/cases/${c.caseId}`;
                const displayAddr = c.rootAddress
                  ? `${c.rootAddress.slice(0, 6)}...${c.rootAddress.slice(-4)}`
                  : c.caseId;

                return (
                  <NavLink
                    key={c.caseId}
                    to={`/cases/${c.caseId}`}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all group',
                      isCurrent
                        ? 'bg-purple-50 text-purple-900 font-semibold shadow-2xs'
                        : 'text-[#526077] hover:bg-slate-50'
                    )}
                    title={`Root: ${c.rootAddress} (${isSeeded ? 'Seeded Data' : 'Live Data'})`}
                  >
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full shrink-0',
                        c.riskLevel === 'critical'
                          ? 'bg-red-500'
                          : c.riskLevel === 'high'
                          ? 'bg-orange-500'
                          : c.riskLevel === 'medium'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      )}
                    />
                    {!sidebarCollapsed && (
                      <div className="flex items-center justify-between flex-1 min-w-0 gap-1.5">
                        <span className="font-mono text-[11px] truncate text-slate-700">
                          {displayAddr}
                        </span>
                        <span
                          className={cn(
                            'text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded tracking-wider border shrink-0 leading-none',
                            isSeeded
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          )}
                        >
                          {isSeeded ? 'SEEDED' : 'LIVE'}
                        </span>
                      </div>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer & Network Controls */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
        {/* Dynamic Network status synced with New Triage and Active Case */}
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-2xl bg-white border border-slate-200/70 shadow-xs transition-all',
            sidebarCollapsed && 'justify-center p-2'
          )}
          title={`Active Consensus Ledger: ${currentChain.name} (#${currentChain.id})`}
        >
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse shrink-0" />
          {!sidebarCollapsed && (
            <div className="flex items-center justify-between flex-1 text-[11px] font-mono">
              <span className="text-slate-700 font-semibold truncate max-w-[120px]">
                {currentChain.name}
              </span>
              <span className="text-slate-400 font-medium">#{currentChain.id}</span>
            </div>
          )}
        </div>

        {!sidebarCollapsed && (
          <div className="px-2 pt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Engine v3.4</span>
            <span>Deterministic</span>
          </div>
        )}
      </div>
    </aside>
  );
};
