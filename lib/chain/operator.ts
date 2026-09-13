import type { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { appPublicClient, appWalletClient } from "./clients";
import { sepoliaRpcUrl } from "./server-rpc";

export function operatorClients() {
  const key = process.env.DEPLOYER_PRIVATE_KEY;
  if (!key) throw new Error("Missing DEPLOYER_PRIVATE_KEY");
  const rpcUrl = sepoliaRpcUrl();
  const account = privateKeyToAccount(key as Hex);
  return {
    account,
    publicClient: appPublicClient(rpcUrl),
    wallet: appWalletClient(rpcUrl, account),
  };
}

export async function waitOperatorTx(
  publicClient: ReturnType<typeof appPublicClient>,
  hash: Hex,
) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error("Operator transaction reverted.");
  }
  return receipt;
}
