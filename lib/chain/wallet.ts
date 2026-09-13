import type { ConnectedWallet } from "@privy-io/react-auth";
import type { EIP1193Provider, Hex } from "viem";
import { APP_CHAIN } from "./config";
import { browserPublicClient, browserWalletClient } from "./clients";

export async function ethereumProviderFromPrivy(wallet: ConnectedWallet) {
  if (wallet.switchChain) {
    await wallet.switchChain(APP_CHAIN.id);
  }
  return (await wallet.getEthereumProvider()) as EIP1193Provider;
}

export async function walletClientFromPrivy(wallet: ConnectedWallet) {
  const { walletClient } = await privyChainClients(wallet);
  return walletClient;
}

export async function privyChainClients(wallet: ConnectedWallet) {
  const provider = await ethereumProviderFromPrivy(wallet);
  return {
    walletClient: browserWalletClient(provider, wallet.address as Hex),
    publicClient: browserPublicClient(provider),
  };
}

export async function publicClientFromPrivy(wallet: ConnectedWallet) {
  const { publicClient } = await privyChainClients(wallet);
  return publicClient;
}
