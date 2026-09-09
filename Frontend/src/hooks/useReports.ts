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

/**
 * Helper to download a PDF report blob directly in browser
 */
export async function downloadReportFile(caseId: string, reportId: string, filename?: string): Promise<void> {
  const blob = await caseRepository.downloadReport(caseId, reportId);
  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename || `case-${caseId}-report-${reportId}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(blobUrl);
}

/**
 * Hook to download a forensic PDF report for a case
 */
export function useDownloadReport() {
  return useMutation<void, Error, { caseId: string; reportId: string; filename?: string }>({
    mutationFn: ({ caseId, reportId, filename }) => downloadReportFile(caseId, reportId, filename),
  });
}

