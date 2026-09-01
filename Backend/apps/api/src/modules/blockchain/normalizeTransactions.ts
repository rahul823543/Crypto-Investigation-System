import type { RawTransfer } from "./blockchain.types.js";

import type {
  NormalizedTransactionInput,
  TransferType,
} from "@sih/shared-types";

function hexToDecimalString(
  hexValue: string | null,
  decimals: string | null
): string {
  // Handle missing/empty values such as "", "0x", or null.
  if (!hexValue || hexValue === "0x") {
    return "0";
  }

  let rawBigInt: bigint;

  try {
    rawBigInt = BigInt(hexValue);
  } catch {
    // Invalid on-chain value should not crash normalization.
    return "0";
  }

  let decimalPlaces: bigint;

  try {
    decimalPlaces =
      decimals && decimals !== "0x" && decimals !== ""
        ? BigInt(decimals)
        : 18n;
  } catch {
    // Fall back to the standard 18 decimals for invalid values.
    decimalPlaces = 18n;
  }

  // Cap the decimal exponent to prevent extremely large
  // BigInt exponentiation from consuming excessive resources.
  if (decimalPlaces < 0n || decimalPlaces > 36n) {
    decimalPlaces = 18n;
  }

  const decimalPlacesNumber = Number(decimalPlaces);
  const divisor = 10n ** decimalPlaces;
  const whole = rawBigInt / divisor;
  const remainder = rawBigInt % divisor;

  if (remainder === 0n) {
    return whole.toString();
  }

  const remainderStr = remainder
    .toString()
    .padStart(decimalPlacesNumber, "0");

  const trimmedRemainder = remainderStr.replace(/0+$/, "");

  return trimmedRemainder
    ? `${whole}.${trimmedRemainder}`
    : whole.toString();
}

function mapCategoryToTransferType(category: string): TransferType {
  return category === "erc20" ? "erc20" : "native";
}

function parseBlockNumber(blockNumHex: string): number {
  if (!blockNumHex) {
    return 0;
  }

  const parsed = Number.parseInt(blockNumHex, 16);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeTransfers(
  rawTransfers: RawTransfer[],
  chainId: number
): NormalizedTransactionInput[] {
  return rawTransfers.map((transfer) => {
    const transferType = mapCategoryToTransferType(transfer.category);

    // Prefer the exact raw on-chain value whenever available.
    // This applies to both native and ERC-20 transfers and avoids
    // floating-point precision loss.
    const amount = transfer.rawContract?.value
      ? hexToDecimalString(
          transfer.rawContract.value,
          transfer.rawContract.decimal ?? "18"
        )
      : (transfer.value ?? 0).toString();

    return {
      hash: transfer.hash,
      chainId,
      blockNumber: parseBlockNumber(transfer.blockNum),
      from: transfer.from,
      to: transfer.to,
      asset: transfer.asset ?? "UNKNOWN",
      tokenAddress: transfer.rawContract?.address ?? null,
      amount,
      amountUsd: null,
      timestamp:
        transfer.metadata?.blockTimestamp ?? new Date().toISOString(),
      transferType,
      method: null,

      // Use the provider's own uniqueId where available;
      // fall back to a composite key so this field is never null
      // and can serve as an idempotency handle in the DB.
      // We include asset and tokenAddress (or "native") so that
      // multiple distinct transfers in the same tx between the same
      // two addresses (e.g. batch transfers, multi-token swaps) each
      // produce a unique key and are not silently dropped by skipDuplicates.
      rawProviderRef:
        transfer.uniqueId ??
        `${transfer.hash}_${transfer.from}_${transfer.to}_${transfer.asset ?? "UNKNOWN"}_${transfer.rawContract?.address ?? "native"}`,
    };
  });
}