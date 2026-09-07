// ─── Evidence & Report Types ────────────────────────────────────────────────

export interface ReportMetadata {
  id?: string;
  caseId: string;
  reportId: string;
  status: 'generating' | 'ready' | 'failed' | 'generated';
  computedHash: string;
  sha256Hash?: string;
  filePath?: string;
  version?: number;
  generatedAt: string;
}

export interface EvidenceMetadata {
  id?: string;
  caseId: string;
  reportId: string;
  caseKeyHash?: string;
  computedHash?: string;
  reportHash?: string;
  transactionHash: string | null;
  contractAddress: string | null;
  chainId: number | null;
  version: number;
  storedAt: string;
  status?: 'pending' | 'storing' | 'stored' | 'failed';
  verificationStatus?: 'confirmed' | 'storage_failed' | 'unanchored' | string;
}

export interface VerifyEvidenceInput {
  caseId: string;
  reportId: string;
}

export interface EvidenceVerificationResult {
  caseId: string;
  reportId: string;
  computedHash: string;
  onChainHash: string | null;
  verified: boolean;
  reason?: string;
  contractAddress: string | null;
  transactionHash: string | null;
  chainId: number | null;
  version: number | null;
  storedAt: string | null;
}

