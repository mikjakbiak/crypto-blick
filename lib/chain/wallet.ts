import type { ConnectedWallet } from "@privy-io/react-auth";
import type { Chain, EIP1193Provider, Hex } from "viem";
import {
  browserProviderPublicClient,
  browserWalletClient,
} from "./clients";

export async function ethereumProviderFromPrivy(
  wallet: ConnectedWallet,
  chain: Chain,
) {
  if (wallet.switchChain) {
    await wallet.switchChain(chain.id);
  }
  return (await wallet.getEthereumProvider()) as EIP1193Provider;
}

export async function privyChainClients(wallet: ConnectedWallet, chain: Chain) {
  const provider = await ethereumProviderFromPrivy(wallet, chain);
  return {
    walletClient: browserWalletClient(provider, wallet.address as Hex, chain),
    publicClient: browserProviderPublicClient(provider, chain),
  };
}

export async function walletClientFromPrivy(
  wallet: ConnectedWallet,
  chain: Chain,
) {
  const { walletClient } = await privyChainClients(wallet, chain);
  return walletClient;
}

export async function publicClientFromPrivy(
  wallet: ConnectedWallet,
  chain: Chain,
) {
  const { publicClient } = await privyChainClients(wallet, chain);
  return publicClient;
}
