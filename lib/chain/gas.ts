import type { Address, PublicClient } from "viem";
import { SELF_PAY_MIN_WEI } from "./constants";

export async function hasSelfPayGas(
  client: PublicClient,
  address: Address,
): Promise<boolean> {
  const balance = await client.getBalance({ address });
  return balance >= SELF_PAY_MIN_WEI;
}
