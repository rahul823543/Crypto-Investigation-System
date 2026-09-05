import { create } from 'zustand';

interface UiState {
  sidebarCollapsed: boolean;
  dataMode: 'mock' | 'api';
  searchQuery: string;
  tableFilter: string;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setDataMode: (mode: 'mock' | 'api') => void;
  setSearchQuery: (query: string) => void;
  setTableFilter: (filter: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  dataMode: (import.meta.env.VITE_DATA_MODE as 'mock' | 'api') || 'mock',
  searchQuery: '',
  tableFilter: 'all',
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setDataMode: (mode) => set({ dataMode: mode }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setTableFilter: (filter) => set({ tableFilter: filter }),
}));
