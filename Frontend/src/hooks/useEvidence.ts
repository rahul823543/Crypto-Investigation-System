import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { caseRepository } from '@/api';
import type {
  EvidenceMetadata,
  EvidenceVerificationResult,
  VerifyEvidenceInput,
} from '@/types';

/**
 * Hook to fetch latest evidence metadata for a case
 */
export function useEvidence(caseId: string | undefined) {
  return useQuery<EvidenceMetadata, Error>({
    queryKey: ['evidence', caseId],
    queryFn: () => caseRepository.getEvidence(caseId!),
    enabled: !!caseId,
    staleTime: 30_000,
  });
}

/**
 * Hook to fetch all evidence records for a case
 */
export function useCaseEvidenceList(caseId: string | undefined) {
  return useQuery<EvidenceMetadata[], Error>({
    queryKey: ['evidence-list', caseId],
    queryFn: () => caseRepository.listEvidence(caseId!),
    enabled: !!caseId,
    staleTime: 30_000,
  });
}

/**
 * Hook to anchor forensic report on-chain
 */
export function useAnchorEvidence() {
  const queryClient = useQueryClient();

  return useMutation<EvidenceMetadata, Error, { caseId: string; reportId: string }>({
    mutationFn: ({ caseId, reportId }) => caseRepository.anchorEvidence(caseId, reportId),
    onSuccess: (_data, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: ['evidence', caseId] });
      queryClient.invalidateQueries({ queryKey: ['evidence-list', caseId] });
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
    },
  });
}

/**
 * Hook to verify cryptographic evidence
 */
export function useVerifyEvidence() {
  return useMutation<EvidenceVerificationResult, Error, VerifyEvidenceInput>({
    mutationFn: (input: VerifyEvidenceInput) =>
      caseRepository.verifyEvidence(input),
  });
}

