import { ethers } from "ethers";

/**
 * Placeholder ABI for on-chain evidence registry contract.
 * Matches deployed signature: storeEvidence(string caseId, bytes32 reportHash).
 */
export const EVIDENCE_ABI = [
  "function storeEvidence(string caseId, bytes32 reportHash)",
  "function getEvidence(string caseId) view returns (bytes32)",
];

export interface EvidenceClientConfig {
  contractAddress?: string;
  rpcUrl?: string;
  privateKey?: string;
  chainId?: number;
}

/**
 * Stores report hash on-chain for a given case.
 * Throws a descriptive error if contract or relayer credentials are not configured.
 */
export async function storeEvidenceOnChain(
  caseId: string,
  reportHash: string,
  config?: EvidenceClientConfig
): Promise<{ transactionHash: string }> {
  const contractAddress =
    config?.contractAddress ?? process.env.EVIDENCE_CONTRACT_ADDRESS;
  const privateKey =
    config?.privateKey ?? process.env.RELAYER_PRIVATE_KEY;
  const rpcUrl =
    config?.rpcUrl ?? process.env.EVIDENCE_RPC_URL;
  const chainId =
    config?.chainId ??
    (process.env.EVIDENCE_CHAIN_ID
      ? Number(process.env.EVIDENCE_CHAIN_ID)
      : undefined);

  if (!contractAddress || !privateKey) {
    throw new Error(
      "Evidence integration not configured: EVIDENCE_CONTRACT_ADDRESS and RELAYER_PRIVATE_KEY are required"
    );
  }

  if (!rpcUrl) {
    throw new Error(
      "Evidence integration not configured: EVIDENCE_RPC_URL is required"
    );
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl, chainId);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, EVIDENCE_ABI, wallet);

  const tx = await contract.storeEvidence(caseId, reportHash);
  return { transactionHash: tx.hash };
}

/**
 * Reads report hash on-chain for a given case.
 * Throws a descriptive error if contract address or RPC URL are not configured.
 */
export async function getEvidenceOnChain(
  caseId: string,
  config?: EvidenceClientConfig
): Promise<string | null> {
  const contractAddress =
    config?.contractAddress ?? process.env.EVIDENCE_CONTRACT_ADDRESS;
  const rpcUrl =
    config?.rpcUrl ?? process.env.EVIDENCE_RPC_URL;
  const chainId =
    config?.chainId ??
    (process.env.EVIDENCE_CHAIN_ID
      ? Number(process.env.EVIDENCE_CHAIN_ID)
      : undefined);

  if (!contractAddress || !rpcUrl) {
    throw new Error(
      "Evidence integration not configured: EVIDENCE_CONTRACT_ADDRESS and EVIDENCE_RPC_URL are required"
    );
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl, chainId);
  const contract = new ethers.Contract(contractAddress, EVIDENCE_ABI, provider);

  const reportHash: string = await contract.getEvidence(caseId);
  if (!reportHash || reportHash === ethers.ZeroHash) {
    return null;
  }
  return reportHash;
}

