import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/api/client';

export interface BackendSeededCase {
  _comment?: string;
  case: {
    id: string;
    rootAddress: string;
    chainId: number;
    mode: string;
    status: string;
    riskScore: number;
    riskLevel: string;
    errorMessage?: string | null;
    createdAt: string;
    updatedAt: string;
  };
  transactions?: any[];
  graph?: any;
  basicFindings?: any[];
  analysisResult?: any;
}

export function useDemoSeededCase() {
  return useQuery<BackendSeededCase>({
    queryKey: ['backend-demo-seeded-case'],
    queryFn: () => apiGet<BackendSeededCase>('/demo/seeded-case'),
    staleTime: 1000 * 60 * 5,
  });
}
