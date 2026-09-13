import type { ConnectedWallet } from "@privy-io/react-auth";
import type { Chain } from "viem";
import { browserWalletClient } from "./clients";

export async function walletClientFromPrivy(
  wallet: ConnectedWallet,
  chain: Chain,
) {
  if (wallet.switchChain) {
    await wallet.switchChain(chain.id);
  }
  const provider = await wallet.getEthereumProvider();
  return browserWalletClient(
    provider as Parameters<typeof browserWalletClient>[0],
    wallet.address as `0x${string}`,
    chain,
  );
}
