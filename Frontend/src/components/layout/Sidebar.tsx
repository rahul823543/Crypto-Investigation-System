import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/uiStore';
import {
  LayoutDashboard,
  Plus,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Fingerprint,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/cases/new', icon: Plus, label: 'New Case' },
  { to: '/evidence/verify', icon: ShieldCheck, label: 'Verify Evidence' },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUiStore();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-cyber-border bg-cyber-surface/90 backdrop-blur-xl transition-all duration-300',
        sidebarCollapsed ? 'w-[68px]' : 'w-[220px]'
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-cyber-border px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/20">
          <Fingerprint className="h-5 w-5 text-cyber-cyan" />
        </div>
        {!sidebarCollapsed && (
          <div className="animate-fade-in">
            <div className="text-sm font-bold text-cyber-text tracking-wide">CIS</div>
            <div className="text-[10px] text-cyber-text-muted leading-none">Forensic Engine</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <SidebarLink
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            collapsed={sidebarCollapsed}
          />
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-cyber-border p-3">
        <button
          onClick={toggleSidebar}
          className="flex h-9 w-full items-center justify-center rounded-lg text-cyber-text-muted hover:bg-cyber-surface-2 hover:text-cyber-text transition-colors cursor-pointer"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}

function SidebarLink({
  to,
  icon: Icon,
  label,
  collapsed,
}: {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  collapsed: boolean;
}) {
  const location = useLocation();
  const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <NavLink
      to={to}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/20 shadow-[0_0_10px_rgba(0,240,255,0.08)]'
          : 'text-cyber-text-dim hover:bg-cyber-surface-2 hover:text-cyber-text border border-transparent'
      )}
    >
      <Icon className={cn('h-4.5 w-4.5 shrink-0', isActive && 'drop-shadow-[0_0_4px_rgba(0,240,255,0.5)]')} />
      {!collapsed && <span className="animate-fade-in">{label}</span>}
    </NavLink>
  );
}
