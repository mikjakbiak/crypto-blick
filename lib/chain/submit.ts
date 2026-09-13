import { createPublicClient, http, type Address, type Hex } from "viem";
import { APP_CHAIN } from "./config";
import { hasSelfPayGas } from "./gas";

type SponsorResult = { hash: Hex };

export async function submitUserTxOrSponsor(args: {
  account: Address;
  sendSelf: () => Promise<Hex>;
  sponsor: () => Promise<SponsorResult>;
}): Promise<{ hash: Hex; sponsored: boolean }> {
  const publicClient = createPublicClient({
    chain: APP_CHAIN,
    transport: http("/api/rpc"),
  });
  const selfPay = await hasSelfPayGas(publicClient, args.account);
  const hash = selfPay ? await args.sendSelf() : (await args.sponsor()).hash;
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error("Transaction reverted.");
  }
  return { hash, sponsored: !selfPay };
}

export async function postSponsor(
  path: string,
  body: unknown,
): Promise<SponsorResult> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { hash?: Hex; error?: string };
  if (!res.ok || !json.hash) {
    throw new Error(json.error ?? "Sponsored transaction failed.");
  }
  return { hash: json.hash };
}
