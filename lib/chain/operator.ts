import type { Chain, Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { appPublicClient, appWalletClient } from "./clients";
import { ENS_CHAIN } from "./config";
import { baseRpcUrl, sepoliaRpcUrl } from "./server-rpc";

export function operatorClients(chain: Chain) {
  const key = process.env.DEPLOYER_PRIVATE_KEY;
  if (!key) throw new Error("Missing DEPLOYER_PRIVATE_KEY");
  const rpcUrl = chain.id === ENS_CHAIN.id ? sepoliaRpcUrl() : baseRpcUrl();
  const account = privateKeyToAccount(key as Hex);
  return {
    account,
    publicClient: appPublicClient(rpcUrl, chain),
    wallet: appWalletClient(rpcUrl, account, chain),
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
