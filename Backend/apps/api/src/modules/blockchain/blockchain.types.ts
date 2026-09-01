export interface FetchTransfersResult {
  transfers: RawTransfer[];
}

export interface RawTransfer {
  uniqueId: string;
  hash: string;
  blockNum: string;
  from: string;
  to: string;
  value: number | null;
  asset: string | null;
  category: string;
  rawContract: {
    address: string | null;
    value: string | null;
    decimal: string | null;
  };
  metadata: {
    blockTimestamp: string;
  };
}