import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { caseRepository } from '@/api';
import type { ReportMetadata } from '@/types';

/**
 * Hook to list all generated forensic reports for a case
 */
export function useCaseReports(caseId: string | undefined) {
  return useQuery<ReportMetadata[], Error>({
    queryKey: ['reports', caseId],
    queryFn: () => caseRepository.listReports(caseId!),
    enabled: !!caseId,
    staleTime: 30_000,
  });
}

/**
 * Hook to generate a new forensic PDF report for a case
 */
export function useGenerateReport() {
  const queryClient = useQueryClient();

  return useMutation<ReportMetadata, Error, string>({
    mutationFn: (caseId: string) => caseRepository.generateReport(caseId),
    onSuccess: (_data, caseId) => {
      queryClient.invalidateQueries({ queryKey: ['reports', caseId] });
      queryClient.invalidateQueries({ queryKey: ['evidence', caseId] });
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
    },
  });
}
