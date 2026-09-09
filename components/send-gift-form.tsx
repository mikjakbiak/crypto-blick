"use client";

import { useState, type FormEvent } from "react";
import { generateGiftCode, saveGiftOnChain } from "@/lib/mock-chain";

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

export default function SendGiftForm() {
  const [amountEth, setAmountEth] = useState("");
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [sendBusy, setSendBusy] = useState(false);
  const [copied, setCopied] = useState<"link" | "code" | null>(null);

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

  if (sendResult) {
    return (
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
    );
  }

  return (
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
  );
}
