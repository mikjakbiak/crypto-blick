import { isAddress, parseEther, parseUnits } from "viem";
import { BASE_USDC } from "@/lib/chain/config";

export const BASE_CAIP2 = "eip155:8453" as const;
export type SwapSide = "ETH" | "USDC";

export function parseSwapBody(body: unknown) {
  const record = (body ?? {}) as {
    from?: unknown;
    amount?: unknown;
    address?: unknown;
  };
  const from = record.from === "USDC" ? "USDC" : record.from === "ETH" ? "ETH" : null;
  const amount =
    typeof record.amount === "string" ? record.amount.trim() : "";
  const address =
    typeof record.address === "string" ? record.address.trim() : "";

  if (!from) throw new Error("Choose ETH or USDC to sell.");
  if (!amount || Number(amount) <= 0) throw new Error("Enter an amount.");
  if (!isAddress(address)) throw new Error("Invalid wallet address.");

  const to: SwapSide = from === "ETH" ? "USDC" : "ETH";
  const baseAmount =
    from === "ETH" ? parseEther(amount).toString() : parseUnits(amount, 6).toString();

  return {
    address,
    from,
    to,
    amount,
    baseAmount,
    source: {
      caip2: BASE_CAIP2,
      asset_address: from === "ETH" ? "native" : BASE_USDC,
    },
    destination: {
      caip2: BASE_CAIP2,
      asset_address: to === "ETH" ? "native" : BASE_USDC,
    },
  };
}
