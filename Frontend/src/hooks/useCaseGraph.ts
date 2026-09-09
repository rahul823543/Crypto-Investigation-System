import { useQuery } from '@tanstack/react-query';
import { caseRepository } from '@/api';
import type { CaseGraph } from '@/types';

/**
 * Hook to fetch graph nodes and edges for a case
 */
export function useCaseGraph(caseId: string | undefined) {
  return useQuery<CaseGraph, Error>({
    queryKey: ['graph', caseId],
    queryFn: () => caseRepository.getGraph(caseId!),
    enabled: !!caseId,
    // A newly created case exists before the worker has built its graph.
    // Keep polling the empty response so the visualization fills in as soon
    // as the graph job persists its first nodes.
    staleTime: 1_000,
    refetchInterval: (query) =>
      query.state.data?.nodes.length ? false : 2_000,
  });
}
