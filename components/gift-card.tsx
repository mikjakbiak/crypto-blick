"use client";

import { useState, type FormEvent } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import LoginPrompt from "@/components/login-prompt";
import {
  claimGiftOnChain,
  clearPendingClaim,
  ENS_SUFFIX,
  getGiftByCode,
  hashGiftCode,
  isEnsAvailable,
  isGiftHashOnChain,
  isValidEnsLabel,
  normalizeEnsLabel,
  savePendingClaim,
  toFullEns,
  type PendingClaim,
} from "@/lib/mock-chain";

type GiftCardProps = {
  initialCode?: string;
  onClaimed: (ens: string) => void;
};

const inputClassName =
  "min-h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base text-zinc-900 outline-none ring-teal-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500";

const primaryButtonClassName =
  "min-h-12 w-full rounded-xl bg-teal-800 px-4 text-base font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-500 dark:text-zinc-950 dark:hover:bg-teal-400";

export default function GiftCard({ initialCode, onClaimed }: GiftCardProps) {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const wallet =
    wallets.find(
      (candidate) =>
        candidate.walletClientType === "privy" ||
        candidate.walletClientType === "privy-v2",
    ) ?? wallets[0];

  const [claimCode, setClaimCode] = useState(initialCode ?? "");
  const [ensLabel, setEnsLabel] = useState("");
  const [claimError, setClaimError] = useState<string | null>(null);
  const [pendingClaim, setPendingClaim] = useState<PendingClaim | null>(null);
  const [claimBusy, setClaimBusy] = useState(false);

  async function handleClaim(event: FormEvent) {
    event.preventDefault();
    setClaimBusy(true);
    setClaimError(null);

    try {
      const code = claimCode.trim();
      const label = normalizeEnsLabel(ensLabel);

      if (!code) {
        setClaimError("Enter a gift code.");
        return;
      }

      if (!isValidEnsLabel(label)) {
        setClaimError("ENS name can’t contain dots or special characters.");
        return;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 300));

      if (!isEnsAvailable(label, wallet?.address)) {
        setClaimError(`${toFullEns(label)} is already taken.`);
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

      void hashGiftCode(code);

      if (authenticated && wallet?.address) {
        const claim = claimGiftOnChain(code, label, wallet.address);
        clearPendingClaim();
        onClaimed(claim.ens);
        return;
      }

      const pending = { code, label };
      savePendingClaim(pending);
      setPendingClaim(pending);
      login();
    } finally {
      setClaimBusy(false);
    }
  }

  if (pendingClaim && !authenticated) {
    return (
      <LoginPrompt title="Complete Privy login to finish claiming your gift." />
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleClaim}>
      <label className="flex flex-col gap-2 text-left">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Gift code
        </span>
        <input
          type="text"
          name="code"
          value={claimCode}
          onChange={(event) => setClaimCode(event.target.value)}
          placeholder="Enter gift code"
          autoComplete="off"
          className={inputClassName}
        />
      </label>

      <label className="flex flex-col gap-2 text-left">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Choose your ENS name
        </span>
        <div className="flex min-h-12 overflow-hidden rounded-xl border border-zinc-200 focus-within:ring-2 focus-within:ring-teal-500/40 dark:border-zinc-700">
          <input
            type="text"
            name="ens"
            value={ensLabel}
            onChange={(event) =>
              setEnsLabel(event.target.value.toLowerCase().replace(/\./g, ""))
            }
            placeholder="yourname"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-white px-4 text-base text-zinc-900 outline-none placeholder:text-zinc-400 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
          <span className="flex shrink-0 items-center border-l border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
            {ENS_SUFFIX}
          </span>
        </div>
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
