"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import GiftCard from "@/components/gift-card";
import {
  claimGiftOnChain,
  clearPendingClaim,
  getEnsByAddress,
  getPendingClaim,
} from "@/lib/mock-chain";

type HomeClientProps = {
  initialCode?: string;
};

export default function HomeClient({ initialCode }: HomeClientProps) {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const wallet =
    wallets.find(
      (candidate) =>
        candidate.walletClientType === "privy" ||
        candidate.walletClientType === "privy-v2",
    ) ?? wallets[0];
  const walletAddress = wallet?.address;
  const [claimSettled, setClaimSettled] = useState(false);

  useEffect(() => {
    if (!ready || !authenticated) return;
    if (!walletsReady || !walletAddress) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;

      const pending = getPendingClaim();
      if (pending) {
        try {
          const existing = getEnsByAddress(walletAddress);
          if (!existing) {
            claimGiftOnChain(pending.code, pending.label, walletAddress);
          }
        } catch {
          // The claim can be retried from the claim form.
        } finally {
          clearPendingClaim();
        }
      }

      if (!cancelled) setClaimSettled(true);
    });

    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, walletsReady, walletAddress]);

  useEffect(() => {
    if (!ready || !authenticated || !claimSettled) return;
    router.replace("/dashboard");
  }, [ready, authenticated, claimSettled, router]);

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        {!ready || (authenticated && !claimSettled) ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : authenticated && claimSettled ? (
          <p className="text-sm text-zinc-500">Taking you to your dashboard…</p>
        ) : (
          <GiftCard
            initialCode={initialCode}
            onClaimed={() => {
              setClaimSettled(true);
            }}
          />
        )}
      </div>
    </div>
  );
}
