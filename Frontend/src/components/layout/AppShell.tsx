import React from 'react';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/uiStore';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { sidebarCollapsed } = useUiStore();

  return (
    <div className="min-h-screen bg-[#FAFAFD] text-[#0F172A] relative flex flex-col selection:bg-purple-100 selection:text-[#4F46E5]">
      {/* Ambient background light orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-24 right-0 w-[55rem] h-[55rem] bg-gradient-to-bl from-purple-200/35 via-fuchsia-100/25 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-[40%] -left-20 w-[42rem] h-[42rem] bg-indigo-100/30 rounded-full blur-[130px]" />
        <div className="absolute bottom-10 right-1/4 w-[36rem] h-[36rem] bg-pink-100/20 rounded-full blur-[140px]" />
      </div>

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div
        className={cn(
          'flex-1 flex flex-col transition-all duration-300 relative z-10',
          sidebarCollapsed ? 'pl-20' : 'pl-64'
        )}
      >
        <Header />
        <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  );
};
