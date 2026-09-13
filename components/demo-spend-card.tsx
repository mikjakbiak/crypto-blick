"use client";

import { useMemo, useState } from "react";

const FREEZE_KEY = "gifty:card-frozen";

function lastFour(address: string) {
  const hex = address.replace(/^0x/i, "").toLowerCase();
  const n = Number.parseInt(hex.slice(-6) || "0", 16);
  return String(n % 10000).padStart(4, "0");
}

function demoPan(address: string) {
  const four = lastFour(address);
  return `4242 42•• •••• ${four}`;
}

function demoExpiry(address: string) {
  const hex = address.replace(/^0x/i, "").toLowerCase();
  const month = (Number.parseInt(hex.slice(0, 2) || "1", 16) % 12) + 1;
  return `${String(month).padStart(2, "0")}/29`;
}

function readFrozen() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(FREEZE_KEY) === "1";
}

type DemoSpendCardProps = {
  address: string;
};

export default function DemoSpendCard({ address }: DemoSpendCardProps) {
  const [open, setOpen] = useState(false);
  const [frozen, setFrozen] = useState(readFrozen);
  const [walletHint, setWalletHint] = useState<string | null>(null);

  const pan = useMemo(() => demoPan(address), [address]);
  const expiry = useMemo(() => demoExpiry(address), [address]);
  const four = useMemo(() => lastFour(address), [address]);

  function toggleFreeze() {
    const next = !frozen;
    setFrozen(next);
    window.localStorage.setItem(FREEZE_KEY, next ? "1" : "0");
  }

  function mockWalletAdd(kind: "Apple Pay" | "Google Pay") {
    setWalletHint(
      `${kind} add is a demo. Live issuing needs Privy + Bridge onboarding.`,
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Spend card
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Demo card. Live issuing is not enabled.
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            frozen
              ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              : "bg-teal-50 text-teal-900 dark:bg-teal-950/60 dark:text-teal-200"
          }`}
        >
          {frozen ? "Frozen" : "Active"}
        </span>
      </div>

      <div
        className={`relative mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-teal-900 via-teal-800 to-zinc-900 px-5 py-6 text-white shadow-[0_18px_40px_-24px_rgba(15,118,110,0.8)] ${
          frozen ? "opacity-60" : ""
        }`}
      >
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-100/80">
          Gifty
        </p>
        <p className="mt-10 font-mono text-lg tracking-[0.18em]">
          •••• •••• •••• {four}
        </p>
        <div className="mt-6 flex items-end justify-between text-xs text-teal-100/80">
          <span>Virtual · demo</span>
          <span>Base USDC</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="min-h-11 rounded-xl border border-zinc-200 px-3 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Details
        </button>
        <button
          type="button"
          onClick={toggleFreeze}
          className="min-h-11 rounded-xl border border-zinc-200 px-3 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          {frozen ? "Unfreeze" : "Freeze"}
        </button>
        <button
          type="button"
          onClick={() => mockWalletAdd("Apple Pay")}
          className="min-h-11 rounded-xl bg-zinc-900 px-3 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Apple Pay
        </button>
        <button
          type="button"
          onClick={() => mockWalletAdd("Google Pay")}
          className="min-h-11 rounded-xl bg-zinc-900 px-3 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Google Pay
        </button>
      </div>

      {walletHint ? (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{walletHint}</p>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Demo card details"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 dark:bg-zinc-950">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Card details · demo
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-zinc-500">PAN</dt>
                <dd className="mt-1 font-mono text-zinc-900 dark:text-zinc-50">{pan}</dd>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-zinc-500">Expiry</dt>
                  <dd className="mt-1 font-mono text-zinc-900 dark:text-zinc-50">
                    {expiry}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">CVV</dt>
                  <dd className="mt-1 font-mono text-zinc-900 dark:text-zinc-50">
                    •••
                  </dd>
                </div>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 min-h-11 w-full rounded-xl bg-zinc-900 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
