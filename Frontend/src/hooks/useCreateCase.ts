import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { caseRepository } from '@/api';
import type { CreateCaseInput, CaseDetail } from '@/types';

/**
 * Hook to create a new investigation case
 */
export function useCreateCase() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<CaseDetail, Error, CreateCaseInput>({
    mutationFn: (input: CreateCaseInput) => caseRepository.createCase(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.setQueryData(['case', data.caseId], data);
      navigate(`/cases/${data.caseId}`);
    },
  });
}
