export type TransferType = "native" | "erc20";

export interface NormalizedTransaction {
  id: string;
  caseId: string;
  hash: string;
  chainId: number;
  blockNumber: number;
  from: string;
  to: string;
  asset: string;
  tokenAddress: string | null; 
  amount: string;           
  amountUsd: number | null;   
  timestamp: string;           
  transferType: TransferType;
  method: string | null;      
  rawProviderRef: string | null;
}

export type NormalizedTransactionInput = Omit<NormalizedTransaction, "id" | "caseId">;