/**
 * Shorten an EVM address for display: 0x742d...bD18
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

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
