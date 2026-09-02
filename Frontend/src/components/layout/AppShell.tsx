import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUiStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

export function AppShell() {
  const { sidebarCollapsed } = useUiStore();

  return (
    <div className="flex min-h-screen bg-cyber-base grid-bg">
      <Sidebar />
      <div
        className={cn(
          'flex flex-1 flex-col transition-all duration-300',
          sidebarCollapsed ? 'ml-[68px]' : 'ml-[220px]'
        )}
      >
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
