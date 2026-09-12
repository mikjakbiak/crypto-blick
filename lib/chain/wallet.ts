import type { ConnectedWallet } from "@privy-io/react-auth";
import { APP_CHAIN } from "./config";
import { browserWalletClient } from "./clients";

export async function walletClientFromPrivy(wallet: ConnectedWallet) {
  if (wallet.switchChain) {
    await wallet.switchChain(APP_CHAIN.id);
  }
  const provider = await wallet.getEthereumProvider();
  return browserWalletClient(
    provider as Parameters<typeof browserWalletClient>[0],
    wallet.address as `0x${string}`,
  );
}
