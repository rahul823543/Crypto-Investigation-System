import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { caseRepository } from '@/api';
import type { AnalysisResponse, AnalysisTriggerResponse } from '@/types';

/**
 * Hook to fetch analysis results for a case
 */
export function useAnalysis(caseId: string | undefined) {
  return useQuery<AnalysisResponse, Error>({
    queryKey: ['analysis', caseId],
    queryFn: () => caseRepository.getAnalysisStatus(caseId!),
    enabled: !!caseId,
    staleTime: 1_000,
    refetchInterval: (query) =>
      query.state.data?.status === 'analyzing' ? 2_000 : false,
  });
}

/**
 * Hook to trigger case re-analysis with status polling
 */
export function useRunAnalysis(caseId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<AnalysisTriggerResponse, Error, void>({
    mutationFn: () => caseRepository.analyzeCase(caseId!),
    onSuccess: (data) => {
      queryClient.setQueryData(['analysis', caseId], {
        status: data.status,
        analysis: null,
        message: data.message,
      } satisfies AnalysisResponse);
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['attribution', caseId] });
      queryClient.invalidateQueries({ queryKey: ['findings', caseId] });
    },
  });
}
