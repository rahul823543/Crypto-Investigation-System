import type {
  FetchTransfersResult,
  RawTransfer,
} from "../blockchain.types.js";

interface JsonRpcResponse<T> {
  result?: T;
  error?: {
    message?: string;
  };
}

interface FetchTransfersParams {
  address: string;
  alchemyApiUrl: string;
}

async function fetchTransfers(
  params: FetchTransfersParams,
  direction: "fromAddress" | "toAddress"
): Promise<RawTransfer[]> {
  const response = await fetch(params.alchemyApiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "alchemy_getAssetTransfers",
      params: [
        {
          [direction]: params.address,
          category: ["external", "erc20"],
          withMetadata: true,
          excludeZeroValue: true,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Alchemy request failed: ${response.status} ${response.statusText}`
    );
  }

  const json = (await response.json()) as JsonRpcResponse<{
    transfers: RawTransfer[];
  }>;

  if (json.error) {
    throw new Error(
      `Alchemy RPC error: ${json.error.message ?? "unknown error"}`
    );
  }

  return json.result?.transfers ?? [];
}

export async function fetchWalletTransfers(
  params: FetchTransfersParams
): Promise<FetchTransfersResult> {
  const [outgoing, incoming] = await Promise.all([
    fetchTransfers(params, "fromAddress"),
    fetchTransfers(params, "toAddress"),
  ]);

  const combined = [...outgoing, ...incoming];

  const seen = new Set<string>();

  const deduplicated = combined.filter((transfer) => {
    const key =
      transfer.uniqueId ??
      `${transfer.hash}:${transfer.from}:${transfer.to}:${transfer.asset}:${transfer.rawContract?.address ?? ""}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });

  return {
    transfers: deduplicated,
  };
}