"use client";

import { useEffect, useState, type FormEvent } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import LoginPrompt from "@/components/login-prompt";
import {
  claimGiftOnChain,
  clearPendingClaim,
  ENS_SUFFIX,
  generateGiftCode,
  getPendingClaim,
  getGiftByCode,
  hashGiftCode,
  isEnsAvailable,
  isGiftHashOnChain,
  isValidEnsLabel,
  normalizeEnsLabel,
  saveGiftOnChain,
  savePendingClaim,
  toFullEns,
  type PendingClaim,
} from "@/lib/mock-chain";

type Mode = "claim" | "send";

type GiftCardProps = {
  initialCode?: string;
  onClaimed: (ens: string) => void;
};

type SendResult = {
  code: string;
  codeHash: string;
  amountEth: string;
  link: string;
};

const inputClassName =
  "min-h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500";

const primaryButtonClassName =
  "min-h-12 w-full rounded-xl bg-zinc-900 px-4 text-base font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white";

export default function GiftCard({ initialCode, onClaimed }: GiftCardProps) {
  const { authenticated, ready, login } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets[0];
  const lockedToClaim = Boolean(initialCode);

  const [mode, setMode] = useState<Mode>("claim");
  const activeMode: Mode = lockedToClaim ? "claim" : mode;

  const [amountEth, setAmountEth] = useState("");
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [sendBusy, setSendBusy] = useState(false);
  const [copied, setCopied] = useState<"link" | "code" | null>(null);

  const [claimCode, setClaimCode] = useState(initialCode ?? "");
  const [ensLabel, setEnsLabel] = useState("");
  const [claimError, setClaimError] = useState<string | null>(null);
  const [pendingClaim, setPendingClaim] = useState<PendingClaim | null>(null);
  const [claimBusy, setClaimBusy] = useState(false);

  useEffect(() => {
    setPendingClaim(getPendingClaim());
  }, []);

  useEffect(() => {
    if (ready && authenticated) {
      setPendingClaim(null);
    }
  }, [ready, authenticated]);

  async function copyText(value: string, kind: "link" | "code") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  }

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    setSendBusy(true);

    try {
      const amount = amountEth.trim();
      if (!amount || Number(amount) <= 0) {
        return;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 400));

      const code = generateGiftCode();
      const gift = saveGiftOnChain(code, amount);
      const link = `${window.location.origin}/?code=${encodeURIComponent(code)}`;

      setSendResult({
        code,
        codeHash: gift.codeHash,
        amountEth: amount,
        link,
      });
    } finally {
      setSendBusy(false);
    }
  }

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

  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div
        className="grid grid-cols-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900"
        role="tablist"
        aria-label="Gift mode"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeMode === "claim"}
          onClick={() => {
            if (!lockedToClaim) setMode("claim");
          }}
          className={`min-h-11 rounded-lg px-3 text-sm font-medium transition-colors ${
            activeMode === "claim"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
              : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          Claim Gift
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeMode === "send"}
          disabled={lockedToClaim}
          onClick={() => setMode("send")}
          className={`min-h-11 rounded-lg px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            activeMode === "send"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
              : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          Send Gift
        </button>
      </div>

      <div className="mt-5">
        {activeMode === "claim" ? (
          pendingClaim && !authenticated ? (
            <LoginPrompt title="Complete Privy login to finish claiming your gift." />
          ) : (
            <form className="flex flex-col gap-4" onSubmit={handleClaim}>
              <label className="flex flex-col gap-2 text-left">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Code
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
                  ENS name
                </span>
                <div className="flex min-h-12 overflow-hidden rounded-xl border border-zinc-200 focus-within:ring-2 focus-within:ring-zinc-400 dark:border-zinc-700">
                  <input
                    type="text"
                    name="ens"
                    value={ensLabel}
                    onChange={(event) =>
                      setEnsLabel(
                        event.target.value.toLowerCase().replace(/\./g, ""),
                      )
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
                <p className="text-sm text-red-600 dark:text-red-400">
                  {claimError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={claimBusy}
                className={primaryButtonClassName}
              >
                {claimBusy ? "Checking…" : "Claim"}
              </button>
            </form>
          )
        ) : sendResult ? (
          <div className="flex flex-col gap-4 text-left">
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Gift created
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Locked {sendResult.amountEth} ETH
              </p>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Share link
              </span>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={sendResult.link}
                  className={`${inputClassName} min-w-0 flex-1`}
                />
                <button
                  type="button"
                  onClick={() => copyText(sendResult.link, "link")}
                  className="min-h-12 shrink-0 rounded-xl border border-zinc-200 px-4 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  {copied === "link" ? "Copied" : "Copy"}
                </button>
              </div>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Code
              </span>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={sendResult.code}
                  className={`${inputClassName} min-w-0 flex-1 font-mono text-sm`}
                />
                <button
                  type="button"
                  onClick={() => copyText(sendResult.code, "code")}
                  className="min-h-12 shrink-0 rounded-xl border border-zinc-200 px-4 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  {copied === "code" ? "Copied" : "Copy"}
                </button>
              </div>
            </label>

            <button
              type="button"
              onClick={() => {
                setSendResult(null);
                setAmountEth("");
              }}
              className="min-h-12 w-full rounded-xl border border-zinc-200 px-4 text-base font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              Send another
            </button>
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSend}>
            <label className="flex flex-col gap-2 text-left">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Amount (ETH)
              </span>
              <input
                type="number"
                name="amount"
                inputMode="decimal"
                min="0"
                step="any"
                value={amountEth}
                onChange={(event) => setAmountEth(event.target.value)}
                placeholder="0.01"
                className={inputClassName}
              />
            </label>
            <button
              type="submit"
              disabled={sendBusy || !amountEth || Number(amountEth) <= 0}
              className={primaryButtonClassName}
            >
              {sendBusy ? "Saving on chain…" : "Send"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
