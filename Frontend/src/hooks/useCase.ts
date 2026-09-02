import { useQuery } from '@tanstack/react-query';
import { caseRepository } from '@/api';
import type { CaseDetail } from '@/types';

/**
 * Hook to fetch a single case by ID
 */
export function useCase(caseId: string | undefined) {
  return useQuery<CaseDetail, Error>({
    queryKey: ['case', caseId],
    queryFn: () => caseRepository.getCase(caseId!),
    enabled: !!caseId,
    staleTime: 15_000, // 15 seconds
  });
}
