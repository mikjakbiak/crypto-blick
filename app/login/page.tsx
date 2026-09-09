"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

export default function LoginPage() {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();

  useEffect(() => {
    if (ready && authenticated) {
      router.replace("/dashboard");
    }
  }, [ready, authenticated, router]);

  useEffect(() => {
    if (!ready || authenticated) return;
    login();
  }, [ready, authenticated]);

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

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 sm:py-14">
        <header className="mb-8 text-center">
          <Link
            href="/"
            className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold tracking-tight text-teal-900 transition-opacity hover:opacity-80 sm:text-4xl dark:text-teal-200"
          >
            Crypto Blick
          </Link>
          <h1 className="mt-4 text-balance font-[family-name:var(--font-fraunces)] text-xl font-medium tracking-tight text-zinc-800 sm:text-2xl dark:text-zinc-100">
            Welcome back
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-pretty text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Sign in to open your dashboard, check balances, and send gifts.
          </p>
        </header>

        <section className="rounded-3xl border border-teal-900/10 bg-white/90 p-5 shadow-[0_24px_60px_-28px_rgba(15,118,110,0.45)] backdrop-blur-sm sm:p-7 dark:border-teal-400/15 dark:bg-zinc-950/85 dark:shadow-[0_24px_60px_-28px_rgba(0,0,0,0.8)]">
          {!ready ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
          ) : authenticated ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Taking you to your dashboard…
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                Continue with email, Google, or a wallet to access your account.
              </p>
              <button
                type="button"
                onClick={login}
                className="min-h-12 w-full rounded-xl bg-teal-800 px-4 text-base font-medium text-white transition-colors hover:bg-teal-700 dark:bg-teal-500 dark:text-zinc-950 dark:hover:bg-teal-400"
              >
                Continue to sign in
              </button>
            </div>
          )}
        </section>

        <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Have a gift code?{" "}
          <Link
            href="/"
            className="font-medium text-teal-800 underline-offset-4 transition-colors hover:text-teal-700 hover:underline dark:text-teal-300 dark:hover:text-teal-200"
          >
            Claim it here
          </Link>
        </p>
      </div>
    </div>
  );
}
