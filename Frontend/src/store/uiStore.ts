import { create } from 'zustand';

export interface ChainMetadata {
  id: number;
  name: string;
  native: string;
  badge?: string;
  color?: string;
}

export const SUPPORTED_CHAINS: Record<number, ChainMetadata> = {
  80002: { id: 80002, name: 'Polygon Amoy', native: 'POL', badge: 'Testnet', color: '#8B5CF6' },
  1: { id: 1, name: 'Ethereum', native: 'ETH', badge: 'Mainnet', color: '#3B82F6' },
  42161: { id: 42161, name: 'Arbitrum One', native: 'ETH', badge: 'L2 Rollup', color: '#0EA5E9' },
  11155111: { id: 11155111, name: 'Sepolia', native: 'SepoliaETH', badge: 'Testnet', color: '#F59E0B' },
};

interface UiState {
  sidebarCollapsed: boolean;
  searchQuery: string;
  tableFilter: string;
  activeChainId: number;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSearchQuery: (query: string) => void;
  setTableFilter: (filter: string) => void;
  setActiveChainId: (chainId: number) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  searchQuery: '',
  tableFilter: 'all',
  activeChainId: 80002,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setTableFilter: (filter) => set({ tableFilter: filter }),
  setActiveChainId: (chainId) => set({ activeChainId: chainId }),
}));

