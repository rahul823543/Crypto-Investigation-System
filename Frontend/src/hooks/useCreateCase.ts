import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getRepository } from '@/api';
import type { CreateCaseInput, CaseDetail } from '@/types';

/**
 * Hook to create a new investigation case.
 * Uses the correct repository (mock vs live) based on the input mode field.
 */
export function useCreateCase() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<CaseDetail, Error, CreateCaseInput>({
    mutationFn: (input: CreateCaseInput) =>
      getRepository(input.mode).createCase(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.setQueryData(['case', data.caseId], data);
      navigate(`/cases/${data.caseId}`);
    },
  });
}
