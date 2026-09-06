import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldAlert,
  FileCheck2,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/uiStore';

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar, dataMode, setDataMode } = useUiStore();
  const location = useLocation();

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
                <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5] animate-pulse shrink-0" />
              </div>
              <span className="text-[11px] text-[#4F46E5] font-mono tracking-wider uppercase font-bold">
                Engine
              </span>
            </div>
          )}
        </NavLink>

        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
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
            location.pathname === item.to ||
            (item.to !== '/' && location.pathname.startsWith(item.to));

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 group relative',
                isActive
                  ? 'bg-purple-50 text-[#4F46E5] font-semibold shadow-xs'
                  : 'text-[#526077] hover:text-[#0F172A] hover:bg-slate-50'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0 transition-colors',
                  isActive
                    ? 'text-[#4F46E5]'
                    : 'text-[#94A3B8] group-hover:text-[#526077]'
                )}
              />
              {!sidebarCollapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={cn(
                        'text-[10px] font-mono px-2 py-0.5 rounded-full',
                        isActive
                          ? 'bg-white text-[#4F46E5] shadow-xs'
                          : 'bg-slate-100 text-[#94A3B8]'
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

        {/* Quick Demo Case Section */}
        <div className="pt-6">
          {!sidebarCollapsed && (
            <div className="px-3 pb-2 flex items-center justify-between">
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#94A3B8] font-bold">
                Quick Demo
              </p>
              <Sparkles className="h-3 w-3 text-purple-500" />
            </div>
          )}
          <NavLink
            to="/cases/case_001"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-medium transition-all group',
              location.pathname.startsWith('/cases/case_001')
                ? 'bg-amber-50 text-amber-900 font-semibold'
                : 'text-[#526077] hover:bg-slate-50'
            )}
          >
            <ShieldAlert className="h-5 w-5 shrink-0 text-amber-500" />
            {!sidebarCollapsed && (
              <div className="flex flex-col truncate">
                <span className="truncate">Seeded High-Risk Case</span>
                <span className="text-[10px] font-mono text-slate-400">
                  0x8d2a...369f1
                </span>
              </div>
            )}
          </NavLink>
        </div>
      </div>

      {/* Bottom Footer & Network Controls */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
        {/* Network status */}
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-2xl bg-white border border-slate-200/70 shadow-xs',
            sidebarCollapsed && 'justify-center p-2'
          )}
        >
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse shrink-0" />
          {!sidebarCollapsed && (
            <div className="flex items-center justify-between flex-1 text-[11px] font-mono">
              <span className="text-slate-600 font-semibold">Polygon Amoy</span>
              <span className="text-slate-400">#80002</span>
            </div>
          )}
        </div>

        {/* Mode toggle */}
        <button
          onClick={() => setDataMode(dataMode === 'mock' ? 'api' : 'mock')}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition-all text-[11px] font-mono cursor-pointer',
            dataMode === 'mock'
              ? 'bg-purple-50/70 border-purple-200 text-purple-800'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-800',
            sidebarCollapsed && 'justify-center p-2'
          )}
          title={`Data mode: ${dataMode.toUpperCase()}`}
        >
          {dataMode === 'mock' ? (
            <ToggleLeft className="h-4 w-4 text-purple-600 shrink-0" />
          ) : (
            <ToggleRight className="h-4 w-4 text-emerald-600 shrink-0" />
          )}
          {!sidebarCollapsed && (
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              {dataMode === 'mock' ? 'Mock Fixtures' : 'Live Fastify API'}
            </span>
          )}
        </button>

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
