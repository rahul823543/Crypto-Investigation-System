import type { ElementDefinition } from 'cytoscape';
import type { GraphNode, GraphEdge } from '@/types';
import { shortenAddress } from './address';

/**
 * Maps API GraphNode and GraphEdge collections to Cytoscape ElementDefinition objects.
 */
export function mapGraphToCytoscapeElements(
  nodes: GraphNode[],
  edges: GraphEdge[]
): ElementDefinition[] {
  const nodeElements: ElementDefinition[] = nodes.map((n) => {
    const isRoot = n.labels.includes('root');
    const displayLabel = n.labels.find((l) => l !== 'root') || shortenAddress(n.address, 4);

    return {
      group: 'nodes',
      data: {
        id: n.id,
        address: n.address,
        label: isRoot ? `★ ${displayLabel}` : displayLabel,
        fullAddress: n.address,
        nodeType: n.type,
        riskLevel: n.riskLevel,
        isRoot,
        totalInUsd: n.totalInUsd,
        totalOutUsd: n.totalOutUsd,
        hopDepth: n.hopDepth ?? 0,
        labels: n.labels,
      },
    };
  });

  const edgeElements: ElementDefinition[] = edges.map((e) => {
    return {
      group: 'edges',
      data: {
        id: e.id,
        source: e.from,
        target: e.to,
        transactionHash: e.transactionHash,
        asset: e.asset,
        amount: e.amount,
        amountUsd: e.amountUsd,
        timestamp: e.timestamp,
        transferType: e.transferType,
        hopDepth: e.hopDepth,
        riskLevel: e.riskLevel,
        label: `${e.amount} ${e.asset}`,
      },
    };
  });

  return [...nodeElements, ...edgeElements];
}
