import crypto from "node:crypto";

/**
 * Computes the SHA-256 hash of a raw Buffer and returns it as a 0x-prefixed hex string (bytes32 format).
 * Must be called on finalized file bytes (e.g. PDF output).
 */
export function hashBuffer(buffer: Buffer): string {
  const hex = crypto.createHash("sha256").update(buffer).digest("hex");
  return `0x${hex}`;
}
