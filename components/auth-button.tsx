"use client";

import { useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  createPublicClient,
  formatEther,
  http,
  type Address,
  type Chain,
} from "viem";
import { mainnet, sepolia } from "viem/chains";

const CHAINS = [mainnet, sepolia] as const;

function chainFromCaip(chainId: string): Chain {
  const numericId = Number(chainId.split(":")[1]);
  return CHAINS.find((chain) => chain.id === numericId) ?? sepolia;
}

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatEthBalance(wei: bigint) {
  const eth = Number(formatEther(wei));
  return eth.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

export default function AuthButton() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const wallet = wallets[0];

  const [balance, setBalance] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  const activeChain = wallet ? chainFromCaip(wallet.chainId) : null;

  useEffect(() => {
    if (!wallet) {
      setBalance(null);
      return;
    }

    let cancelled = false;
    const chain = chainFromCaip(wallet.chainId);
    const client = createPublicClient({
      chain,
      transport: http(),
    });

    client
      .getBalance({ address: wallet.address as Address })
      .then((wei) => {
        if (!cancelled) setBalance(formatEthBalance(wei));
      })
      .catch(() => {
        if (!cancelled) setBalance(null);
      });

    return () => {
      cancelled = true;
    };
  }, [wallet?.address, wallet?.chainId]);

  async function switchToChain(chainId: number) {
    if (!wallet || switching || activeChain?.id === chainId) return;

    setSwitching(true);
    try {
      await wallet.switchChain(chainId);
    } finally {
      setSwitching(false);
    }
  }

  if (!ready) {
    return (
      <button
        type="button"
        disabled
        className="h-12 rounded-full bg-zinc-200 px-6 text-zinc-500"
      >
        Loading…
      </button>
    );
  }

  if (authenticated) {
    return (
      <div className="flex w-full flex-col items-center gap-4 sm:items-start">
        {wallet && walletsReady ? (
          <>
            <p className="font-mono text-sm text-zinc-600 dark:text-zinc-400">
              <span>{shortenAddress(wallet.address)}</span>
              <span className="mx-2 text-zinc-300 dark:text-zinc-600">·</span>
              <span>
                {balance === null ? "…" : `${balance} ETH`}
              </span>
            </p>

            <div
              className="inline-flex rounded-full border border-black/10 p-1 dark:border-white/20"
              role="group"
              aria-label="Network"
            >
              {CHAINS.map((chain) => {
                const isActive = activeChain?.id === chain.id;
                return (
                  <button
                    key={chain.id}
                    type="button"
                    disabled={switching}
                    onClick={() => switchToChain(chain.id)}
                    className={`rounded-full px-4 py-2 text-sm transition-colors disabled:opacity-60 ${
                      isActive
                        ? "bg-foreground text-background"
                        : "text-zinc-600 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/10"
                    }`}
                  >
                    {chain.name}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-sm text-zinc-500">Connecting wallet…</p>
        )}

        <button
          type="button"
          onClick={logout}
          className="h-12 rounded-full border border-black/10 px-6 transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={login}
      className="h-12 rounded-full bg-foreground px-6 text-background transition-colors hover:bg-[#383838] hover:cursor-pointer dark:hover:bg-[#ccc]"
    >
      Log in
    </button>
  );
}
