import { useQuery } from '@tanstack/react-query';
import { caseRepository } from '@/api';
import type { CaseSummary } from '@/types';

/**
 * Hook to fetch the list of all cases
 */
export function useCases() {
  return useQuery<CaseSummary[], Error>({
    queryKey: ['cases'],
    queryFn: () => caseRepository.listCases(),
    staleTime: 30_000, // 30 seconds
  });
}
