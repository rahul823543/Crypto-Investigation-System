export type TransferType = "native" | "erc20";

export interface NormalizedTransaction {
  id: string;
  caseId: string;
  hash: string;
  chainId: number;
  blockNumber: number;
  /** Source wallet address */
  from: string;
  /** Destination address */
  to: string;
  /** Token symbol e.g. "ETH", "USDC" */
  asset: string;
  /** ERC-20 contract address; null for native transfers */
  tokenAddress: string | null;
  /** Raw amount string */
  amount: string;
  /** USD equivalent at time of transfer; null when price data is unavailable */
  amountUsd: number | null;
  timestamp: string; // ISO-8601
  transferType: TransferType;
  /** ABI-decoded method name e.g. "transfer", "swapExactTokensForTokens" */
  method?: string | null;
  /** Opaque deduplication key supplied by the data provider (e.g. Alchemy uniqueId) */
  rawProviderRef?: string | null;
}

/**
 * Write-only shape produced by the normalizer before a DB record exists.
 * Omits `id` and `caseId` which are assigned at persist time.
 */
export type NormalizedTransactionInput = Omit<NormalizedTransaction, "id" | "caseId">;


