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

const MAX_TRANSFERS_PER_DIRECTION = 5000;
const FETCH_TIMEOUT_MS = 15_000;

async function fetchTransfers(
  params: FetchTransfersParams,
  direction: "fromAddress" | "toAddress"
): Promise<RawTransfer[]> {
  const allTransfers: RawTransfer[] = [];
  let pageKey: string | undefined = undefined;

  do {
    const payloadParams: Record<string, any> = {
      [direction]: params.address,
      category: ["external", "erc20"],
      withMetadata: true,
      excludeZeroValue: true,
      maxCount: "0x3e8", // 1000 per page
    };

    if (pageKey) {
      payloadParams.pageKey = pageKey;
    }

    const response = await fetch(params.alchemyApiUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "alchemy_getAssetTransfers",
        params: [payloadParams],
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(
        `Alchemy request failed: ${response.status} ${response.statusText}`
      );
    }

    const json = (await response.json()) as JsonRpcResponse<{
      transfers: RawTransfer[];
      pageKey?: string;
    }>;

    if (json.error) {
      throw new Error(
        `Alchemy RPC error: ${json.error.message ?? "unknown error"}`
      );
    }

    const transfers = json.result?.transfers ?? [];
    allTransfers.push(...transfers);

    pageKey = json.result?.pageKey;

    if (allTransfers.length >= MAX_TRANSFERS_PER_DIRECTION) {
      console.warn(
        `Alchemy transfer pagination capped at ${MAX_TRANSFERS_PER_DIRECTION} for ${direction} on ${params.address}`
      );
      break;
    }
  } while (pageKey);

  return allTransfers;
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