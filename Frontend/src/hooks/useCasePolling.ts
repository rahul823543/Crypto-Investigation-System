import { useQuery } from '@tanstack/react-query';
import { caseRepository } from '@/api';
import type { CaseDetail } from '@/types';

/**
 * Hook to fetch a case with automatic polling while pipeline stages are active
 */
export function useCasePolling(caseId: string | undefined) {
  return useQuery<CaseDetail, Error>({
    queryKey: ['case', caseId],
    queryFn: () => caseRepository.getCase(caseId!),
    enabled: !!caseId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      // Stop polling when reached terminal states
      if (
        data.status === 'analysis_complete' ||
        data.status === 'analyzed' ||
        data.status === 'completed' ||
        data.status === 'failed'
      ) {
        return false;
      }
      return 2000; // Poll every 2 seconds while running
    },
    staleTime: 1000,
  });
}
