import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Account,
  type EIP1193Provider,
  type Hex,
} from "viem";
import { APP_CHAIN } from "./config";

export function appPublicClient(rpcUrl: string) {
  return createPublicClient({
    chain: APP_CHAIN,
    transport: http(rpcUrl),
  });
}

export function appWalletClient(rpcUrl: string, account: Account) {
  return createWalletClient({
    account,
    chain: APP_CHAIN,
    transport: http(rpcUrl),
  });
}

export function browserWalletClient(provider: EIP1193Provider, account: Hex) {
  return createWalletClient({
    account,
    chain: APP_CHAIN,
    transport: custom(provider),
  });
}
