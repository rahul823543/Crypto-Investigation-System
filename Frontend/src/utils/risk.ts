import type { RiskLevel } from '@/types';

/**
 * Maps risk levels to cyberpunk theme colors
 */
const riskColorMap: Record<RiskLevel, string> = {
  low: '#39ff14',       // Neon green
  medium: '#ffb800',    // Amber
  high: '#ff6b35',      // Neon orange
  critical: '#ff0040',  // Neon red
};

const riskBgMap: Record<RiskLevel, string> = {
  low: 'rgba(57, 255, 20, 0.12)',
  medium: 'rgba(255, 184, 0, 0.12)',
  high: 'rgba(255, 107, 53, 0.12)',
  critical: 'rgba(255, 0, 64, 0.12)',
};

const riskGlowMap: Record<RiskLevel, string> = {
  low: '0 0 8px rgba(57, 255, 20, 0.4)',
  medium: '0 0 8px rgba(255, 184, 0, 0.4)',
  high: '0 0 8px rgba(255, 107, 53, 0.4)',
  critical: '0 0 12px rgba(255, 0, 64, 0.5)',
};

export function getRiskColor(level: RiskLevel): string {
  return riskColorMap[level] ?? riskColorMap.low;
}

export function getRiskBg(level: RiskLevel): string {
  return riskBgMap[level] ?? riskBgMap.low;
}

export function getRiskGlow(level: RiskLevel): string {
  return riskGlowMap[level] ?? riskGlowMap.low;
}

export function getRiskLabel(level: RiskLevel): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

/**
 * Tailwind class mapping for risk badge styling
 */
export function getRiskBadgeClasses(level: RiskLevel): string {
  const classes: Record<RiskLevel, string> = {
    low: 'bg-green-500/15 text-green-400 border-green-500/30',
    medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    critical: 'bg-red-500/15 text-red-400 border-red-500/30',
  };
  return classes[level] ?? classes.low;
}

/**
 * Get status color classes
 */
export function getStatusClasses(status: string): string {
  if (status === 'complete' || status === 'ready' || status === 'stored' || status === 'completed' || status === 'analysis_complete') {
    return 'bg-green-500/15 text-green-400 border-green-500/30';
  }
  if (status === 'running' || status === 'generating' || status === 'storing' || status === 'ingesting' || status === 'analyzing' || status === 'graph_building') {
    return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
  }
  if (status === 'failed') {
    return 'bg-red-500/15 text-red-400 border-red-500/30';
  }
  if (status === 'pending' || status === 'not_started' || status === 'created') {
    return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  }
  return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
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
