"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { formatUnits } from "viem";
import { formatTokenAmount } from "@/lib/tokens";
import type { SwapSide } from "@/lib/privy/swap";

type SwapPanelProps = {
  address: string;
  ethRaw: string;
  usdcRaw: string;
  onSwapped: () => void;
};

function formatRaw(raw: string, decimals: number) {
  try {
    return formatTokenAmount(Number(formatUnits(BigInt(raw), decimals)));
  } catch {
    return "0";
  }
}

export default function SwapPanel({
  address,
  ethRaw,
  usdcRaw,
  onSwapped,
}: SwapPanelProps) {
  const { getAccessToken } = usePrivy();
  const [from, setFrom] = useState<SwapSide>("USDC");
  const [amount, setAmount] = useState("");
  const [quoteOut, setQuoteOut] = useState<string | null>(null);
  const [busy, setBusy] = useState<"quote" | "swap" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const to: SwapSide = from === "ETH" ? "USDC" : "ETH";

  async function authedPost(path: string) {
    const token = await getAccessToken();
    if (!token) throw new Error("Sign in again to swap.");
    const res = await fetch(path, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from, amount, address }),
    });
    const json = (await res.json()) as {
      error?: string;
      outputAmount?: string;
    };
    if (!res.ok) throw new Error(json.error ?? "Swap request failed.");
    return json;
  }

  async function handleQuote() {
    setBusy("quote");
    setError(null);
    try {
      const json = await authedPost("/api/swap/quote");
      setQuoteOut(json.outputAmount ?? null);
    } catch (caught) {
      setQuoteOut(null);
      setError(caught instanceof Error ? caught.message : "Could not quote.");
    } finally {
      setBusy(null);
    }
  }

  async function handleSwap() {
    setBusy("swap");
    setError(null);
    try {
      await authedPost("/api/swap/execute");
      setQuoteOut(null);
      setAmount("");
      onSwapped();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not swap.");
    } finally {
      setBusy(null);
    }
  }

  const quoted =
    quoteOut == null
      ? null
      : formatTokenAmount(
          Number(formatUnits(BigInt(quoteOut), to === "ETH" ? 18 : 6)),
        );

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Swap
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Trade ETH and USDC in this wallet on Base.
      </p>
      <div className="mt-4 grid grid-cols-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
        {(["USDC", "ETH"] as const).map((side) => (
          <button
            key={side}
            type="button"
            onClick={() => {
              setFrom(side);
              setQuoteOut(null);
            }}
            className={`min-h-10 rounded-lg px-3 text-sm font-medium transition-colors ${
              from === side
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {side} → {side === "ETH" ? "USDC" : "ETH"}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
        Available: {formatRaw(from === "ETH" ? ethRaw : usdcRaw, from === "ETH" ? 18 : 6)}{" "}
        {from}
      </p>
      <input
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={(event) => {
          setAmount(event.target.value);
          setQuoteOut(null);
        }}
        placeholder={`Amount of ${from}`}
        className="mt-2 min-h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base text-zinc-900 outline-none ring-teal-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
      />
      {quoted ? (
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          You receive about {quoted} {to}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void handleQuote()}
          disabled={busy !== null}
          className="min-h-12 rounded-xl border border-zinc-200 px-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          {busy === "quote" ? "Quoting…" : "Get quote"}
        </button>
        <button
          type="button"
          onClick={() => void handleSwap()}
          disabled={busy !== null}
          className="min-h-12 rounded-xl bg-teal-800 px-3 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-500 dark:text-zinc-950 dark:hover:bg-teal-400"
        >
          {busy === "swap" ? "Swapping…" : `Swap to ${to}`}
        </button>
      </div>
    </section>
  );
}
