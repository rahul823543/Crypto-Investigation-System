import { useQuery, useMutation } from '@tanstack/react-query';
import { caseRepository } from '@/api';
import type {
  EvidenceMetadata,
  EvidenceVerificationResult,
  VerifyEvidenceInput,
} from '@/types';

/**
 * Hook to fetch evidence metadata for a case
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
 * Hook to verify cryptographic evidence
 */
export function useVerifyEvidence() {
  return useMutation<EvidenceVerificationResult, Error, VerifyEvidenceInput>({
    mutationFn: (input: VerifyEvidenceInput) =>
      caseRepository.verifyEvidence(input),
  });
}
