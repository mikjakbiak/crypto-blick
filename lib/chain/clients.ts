import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Account,
  type Chain,
  type EIP1193Provider,
  type Hex,
} from "viem";

export function appPublicClient(rpcUrl: string, chain: Chain) {
  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}

export function appWalletClient(rpcUrl: string, account: Account, chain: Chain) {
  return createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });
}

export function browserWalletClient(
  provider: EIP1193Provider,
  account: Hex,
  chain: Chain,
) {
  return createWalletClient({
    account,
    chain,
    transport: custom(provider),
  });
}

export function browserPublicClient(rpcPath: string, chain: Chain) {
  return createPublicClient({
    chain,
    transport: http(rpcPath),
  });
}
