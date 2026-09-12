"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import {
  extractGiftCode,
  getGiftByCode,
  isGiftHashOnChain,
} from "@/lib/mock-chain";
import { dashboardPath, homePath } from "@/lib/paths";
import { rememberClaimCode } from "@/lib/claim-code";

type GiftCardProps = {
  initialCode?: string;
};

const inputClassName =
  "min-h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base text-zinc-900 outline-none ring-teal-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500";

const primaryButtonClassName =
  "min-h-12 w-full rounded-xl bg-teal-800 px-4 text-base font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-500 dark:text-zinc-950 dark:hover:bg-teal-400";

export default function GiftCard({ initialCode }: GiftCardProps) {
  const router = useRouter();
  const { authenticated, login } = usePrivy();
  const [claimCode, setClaimCode] = useState(initialCode ?? "");
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimBusy, setClaimBusy] = useState(false);

  async function handleClaim(event: FormEvent) {
    event.preventDefault();
    setClaimBusy(true);
    setClaimError(null);

    try {
      const code = extractGiftCode(claimCode);
      if (!code) {
        setClaimError("Enter a gift code or paste the gift link.");
        return;
      }

      if (!isGiftHashOnChain(code)) {
        setClaimError("Gift code was not found on chain.");
        return;
      }

      if (getGiftByCode(code)?.isClaimed) {
        setClaimError("Gift code has already been claimed.");
        return;
      }

      rememberClaimCode(code);

      if (authenticated) {
        router.replace(dashboardPath(code));
        return;
      }

      router.replace(homePath(code));
      login();
    } finally {
      setClaimBusy(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleClaim}>
      <label className="flex flex-col gap-2 text-left">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Gift code or link
        </span>
        <input
          type="text"
          name="code"
          value={claimCode}
          onChange={(event) => setClaimCode(event.target.value)}
          placeholder="Paste code or gift URL"
          autoComplete="off"
          className={inputClassName}
        />
      </label>

      {claimError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{claimError}</p>
      ) : null}

      <button
        type="submit"
        disabled={claimBusy}
        className={primaryButtonClassName}
      >
        {claimBusy ? "Checking…" : "Claim gift"}
      </button>
    </form>
  );
}
