import type { RiskLevel } from '@/types';

export function getRiskLabel(level: RiskLevel): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

/**
 * Get chain name from chain ID
 */
export function getChainName(chainId: number): string {
  const chains: Record<number, string> = {
    1: 'Ethereum',
    137: 'Polygon',
    80002: 'Amoy Testnet',
    56: 'BNB Chain',
    42161: 'Arbitrum',
    10: 'Optimism',
  };
  return chains[chainId] ?? `Chain ${chainId}`;
}
