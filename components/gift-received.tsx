"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { formatUnits } from "viem";
import { formatTokenAmount } from "@/lib/tokens";

type GiftReceivedProps = {
  paidWei: bigint;
  celebrate: boolean;
};

export default function GiftReceived({ paidWei, celebrate }: GiftReceivedProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const hide = window.setTimeout(() => setVisible(false), 4500);
    return () => window.clearTimeout(hide);
  }, []);
  useEffect(() => {
    if (!celebrate) return;
    const burst = () =>
      confetti({
        particleCount: 140,
        spread: 78,
        startVelocity: 42,
        origin: { y: 0.55 },
        colors: ["#0f766e", "#14b8a6", "#fbbf24", "#f8fafc"],
      });
    burst();
    const second = window.setTimeout(burst, 280);
    return () => window.clearTimeout(second);
  }, [celebrate]);

  const amount = formatTokenAmount(Number(formatUnits(paidWei, 18)), 6);

  if (!visible) return null;

  return (
    <div className="rounded-2xl border border-teal-900/15 bg-teal-50 px-4 py-4 text-teal-950 dark:border-teal-400/25 dark:bg-teal-950/50 dark:text-teal-50">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal-800 dark:text-teal-300">
        Gift received
      </p>
      <p className="mt-1 font-display text-2xl font-semibold tracking-tight">
        {amount} ETH
      </p>
      <p className="mt-1 text-sm text-teal-800/80 dark:text-teal-200/80">
        It’s in this wallet now.
      </p>
    </div>
  );
}
