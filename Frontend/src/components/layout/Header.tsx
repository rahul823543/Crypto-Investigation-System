import { useLocation } from 'react-router-dom';
import { DataModeBadge } from '@/components/ui/DataModeBadge';
import { useUiStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';

const pageTitles: Record<string, string> = {
  '/': 'Investigation Dashboard',
  '/cases/new': 'New Investigation',
  '/evidence/verify': 'Evidence Verification',
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.match(/^\/cases\/[^/]+\/report$/)) return 'Investigation Report';
  if (pathname.match(/^\/cases\/[^/]+$/)) return 'Case Investigation';
  return 'Crypto Investigation System';
}

export function Header() {
  const location = useLocation();
  const { sidebarCollapsed } = useUiStore();
  const title = getPageTitle(location.pathname);

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 items-center justify-between border-b border-cyber-border bg-cyber-base/80 backdrop-blur-lg px-6 transition-all duration-300',
        sidebarCollapsed ? 'ml-[68px]' : 'ml-[220px]'
      )}
    >
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-cyber-text">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Search placeholder */}
        <div className="hidden md:flex items-center gap-2 rounded-lg border border-cyber-border bg-cyber-surface px-3 py-1.5 text-sm text-cyber-text-muted">
          <Search className="h-3.5 w-3.5" />
          <span className="text-xs">Search cases...</span>
          <kbd className="ml-4 rounded border border-cyber-border bg-cyber-surface-2 px-1.5 py-0.5 text-[10px] font-mono text-cyber-text-muted">
            ⌘K
          </kbd>
        </div>

        <DataModeBadge />
      </div>
    </header>
  );
}
