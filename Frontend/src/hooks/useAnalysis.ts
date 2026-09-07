import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { caseRepository } from '@/api';
import type { AnalysisResult } from '@/types';

/**
 * Hook to fetch analysis results for a case
 */
export function useAnalysis(caseId: string | undefined) {
  return useQuery<AnalysisResult | null, Error>({
    queryKey: ['analysis', caseId],
    queryFn: () => caseRepository.getAnalysis(caseId!),
    enabled: !!caseId,
    staleTime: 30_000,
  });
}

/**
 * Hook to trigger case re-analysis with status polling
 */
export function useRunAnalysis(caseId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<AnalysisResult, Error, void>({
    mutationFn: () => caseRepository.analyzeCase(caseId!),
    onSuccess: (data) => {
      queryClient.setQueryData(['analysis', caseId], data);
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['attribution', caseId] });
      queryClient.invalidateQueries({ queryKey: ['findings', caseId] });
    },
  });
}
