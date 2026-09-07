import { useQuery } from '@tanstack/react-query';
import { caseRepository } from '@/api';
import type { VaspAttribution } from '@/types';

/**
 * Hook to fetch nearest-VASP attribution for a case
 */
export function useAttribution(caseId: string | undefined) {
  return useQuery<VaspAttribution | null, Error>({
    queryKey: ['attribution', caseId],
    queryFn: () => caseRepository.getAttribution(caseId!),
    enabled: !!caseId,
    staleTime: 30_000,
  });
}
