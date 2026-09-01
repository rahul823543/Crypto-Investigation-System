import { z } from "zod";

export const SUPPORTED_CHAIN_IDS = [80002] as const;

export const createCaseSchema = z.object({
  rootAddress: z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "rootAddress must be a valid EVM address")
  .transform((val) => val.toLowerCase()),
  chainId: z.literal(80002, {
    message: "Unsupported chainId. Only Polygon Amoy (chainId 80002) is supported.",
  }),
  mode: z.enum(["demo", "live"]),
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;