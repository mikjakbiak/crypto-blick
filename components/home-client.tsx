"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

  if (!ready || (authenticated && !claimSettled)) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-8 text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  if (authenticated && claimSettled) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-8 text-sm text-zinc-500">
        Taking you to your dashboard…
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(13,148,136,0.16),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(15,118,110,0.1),_transparent_45%),linear-gradient(180deg,#f4faf9_0%,#eef2f1_48%,#f8faf9_100%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(45,212,191,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(13,148,136,0.08),_transparent_45%),linear-gradient(180deg,#09090b_0%,#0c1211_50%,#09090b_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(24,24,27,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(24,24,27,0.04)_1px,transparent_1px)] [background-size:28px_28px] dark:opacity-[0.2] dark:[background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)]"
      />

      <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 sm:py-14">
        <header className="mb-8 text-center sm:mb-10">
          <p className="font-[family-name:var(--font-fraunces)] text-4xl font-semibold tracking-tight text-teal-900 sm:text-5xl dark:text-teal-200">
            Crypto Blick
          </p>
          <h1 className="mt-4 text-balance font-[family-name:var(--font-fraunces)] text-xl font-medium tracking-tight text-zinc-800 sm:text-2xl dark:text-zinc-100">
            Welcome — claim the gift waiting for you
          </h1>
          <p className="mx-auto mt-3 max-w-md text-pretty text-sm leading-6 text-zinc-600 sm:text-base dark:text-zinc-400">
            Enter your code, pick an ENS name, and open your wallet in a few
            steps.
          </p>
        </header>

        <section
          aria-labelledby="claim-heading"
          className="rounded-3xl border border-teal-900/10 bg-white/90 p-5 shadow-[0_24px_60px_-28px_rgba(15,118,110,0.45)] backdrop-blur-sm sm:p-7 dark:border-teal-400/15 dark:bg-zinc-950/85 dark:shadow-[0_24px_60px_-28px_rgba(0,0,0,0.8)]"
        >
          <h2
            id="claim-heading"
            className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            Claim your gift
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Have a code? Start here.
          </p>
          <div className="mt-5">
            <GiftCard
              initialCode={initialCode}
              onClaimed={() => {
                setClaimSettled(true);
              }}
            />
          </div>
        </section>

        <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-teal-800 underline-offset-4 transition-colors hover:text-teal-700 hover:underline dark:text-teal-300 dark:hover:text-teal-200"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
