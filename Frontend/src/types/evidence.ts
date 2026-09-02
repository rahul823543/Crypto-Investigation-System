// ─── Evidence & Report Types ────────────────────────────────────────────────

export interface ReportMetadata {
  caseId: string;
  reportId: string;
  status: 'generating' | 'ready' | 'failed';
  computedHash: string;
  generatedAt: string;
}

export interface EvidenceMetadata {
  caseId: string;
  reportId: string;
  computedHash: string;
  transactionHash: string;
  contractAddress: string;
  chainId: number;
  version: number;
  storedAt: string;
  status: 'pending' | 'storing' | 'stored' | 'failed';
}

export interface VerifyEvidenceInput {
  caseId: string;
  reportId: string;
}

export interface EvidenceVerificationResult {
  caseId: string;
  reportId: string;
  computedHash: string;
  onChainHash: string;
  verified: boolean;
  contractAddress: string;
  transactionHash: string;
  chainId: number;
  version: number;
  storedAt: string;
}
