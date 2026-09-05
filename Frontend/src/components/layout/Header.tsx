import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Plus, Menu } from 'lucide-react';
import { useUiStore } from '@/store/uiStore';
import { Button } from '@/components/ui/Button';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleSidebar, searchQuery, setSearchQuery } = useUiStore();

  const getPageTitle = () => {
    if (location.pathname === '/') return 'Forensic Triage Engine';
    if (location.pathname === '/create') return 'Create Case Investigation';
    if (location.pathname === '/evidence') return 'Cryptographic Proof & Notary';
    if (location.pathname.startsWith('/cases/')) return 'Case Forensic Workspace';
    return 'Forensic Suite';
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/70 px-4 sm:px-8 py-3.5 transition-all">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Breadcrumb Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="md:hidden p-2 rounded-2xl hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div>
            <h1 className="font-display font-bold text-base sm:text-lg text-[#0F172A] tracking-tight flex items-center gap-2">
              <span>{getPageTitle()}</span>
            </h1>
          </div>
        </div>

        {/* Center/Right: Quick Search & Launch Action */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center bg-slate-100/90 hover:bg-slate-100 border border-slate-200/70 rounded-full px-3.5 py-1.5 transition-all w-64 focus-within:w-80 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-400">
            <Search className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search case, address, hash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-xs font-mono text-[#0F172A] placeholder:text-slate-400 focus:outline-none w-full"
            />
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={() => navigate('/create')}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            className="shadow-sm"
          >
            <span className="hidden sm:inline">New Triage</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
