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
    staleTime: 60_000,
  });
}
