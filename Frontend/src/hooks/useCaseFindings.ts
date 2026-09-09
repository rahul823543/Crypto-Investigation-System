import { useQuery } from '@tanstack/react-query';
import { caseRepository } from '@/api';
import type { GraphFinding } from '@/types';

/**
 * Hook to fetch risk findings for a case
 */
export function useCaseFindings(caseId: string | undefined) {
  return useQuery<GraphFinding[], Error>({
    queryKey: ['findings', caseId],
    queryFn: () => caseRepository.getFindings(caseId!),
    enabled: !!caseId,
    // Detectors run in the graph worker after this screen can already be open.
    staleTime: 1_000,
    refetchInterval: (query) =>
      query.state.data?.length ? false : 2_000,
  });
}
