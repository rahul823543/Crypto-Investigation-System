/**
 * Shorten an EVM address for display: 0x742d...bD18
 */
export function shortenAddress(address: string, startChars = 4, endChars = startChars): string {
  if (!address) return '';
  if (address.length <= startChars + endChars + 2) return address;
  return `${address.slice(0, startChars + 2)}...${address.slice(-endChars)}`;
}

export const truncateAddress = shortenAddress;

/**
 * Validate an EVM wallet address (0x + 40 hex chars)
 */
export function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Normalize address to lowercase for comparison
 */
export function normalizeAddress(address: string): string {
  return address.toLowerCase();
}
