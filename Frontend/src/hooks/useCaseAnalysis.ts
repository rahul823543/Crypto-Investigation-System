import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { caseRepository } from '@/api';
import type { AnalysisResult } from '@/types';

/**
 * Hook to fetch advanced graph analysis results for a case
 */
export function useCaseAnalysis(caseId: string | undefined) {
  return useQuery<AnalysisResult | null, Error>({
    queryKey: ['analysis', caseId],
    queryFn: () => caseRepository.getAnalysis(caseId!),
    enabled: !!caseId,
    staleTime: 60_000,
  });
}

/**
 * Hook to trigger analysis pipeline on a case
 */
export function useTriggerAnalysis() {
  const queryClient = useQueryClient();

  return useMutation<AnalysisResult, Error, string>({
    mutationFn: (caseId: string) => caseRepository.analyzeCase(caseId),
    onSuccess: (data, caseId) => {
      queryClient.setQueryData(['analysis', caseId], data);
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['findings', caseId] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}
