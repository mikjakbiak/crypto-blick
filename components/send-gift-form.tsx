"use client";

import { useState, type FormEvent } from "react";
import { useWallets } from "@privy-io/react-auth";
import { formatEther, isAddress } from "viem";
import {
  generateGiftCode,
  saveGiftOnChain,
  sendEthOnChain,
} from "@/lib/mock-chain";

export type SendMode = "gift" | "transfer";

type GiftResult = {
  kind: "gift";
  code: string;
  codeHash: string;
  amountEth: string;
  link: string;
};

type TransferResult = {
  kind: "transfer";
  amountEth: string;
  recipient: string;
  toAddress: string;
};

type SendResult = GiftResult | TransferResult;

type SendGiftFormProps = {
  mode?: SendMode;
  initialRecipient?: string;
  onTransferred?: () => void;
};

const inputClassName =
  "min-h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500";

const primaryButtonClassName =
  "min-h-12 w-full rounded-xl bg-zinc-900 px-4 text-base font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white";

function isValidRecipient(value: string) {
  return isAddress(value) || /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(value);
}

export default function SendGiftForm({
  mode = "gift",
  initialRecipient = "",
  onTransferred,
}: SendGiftFormProps) {
  const { wallets } = useWallets();
  const wallet =
    wallets.find(
      (candidate) =>
        candidate.walletClientType === "privy" ||
        candidate.walletClientType === "privy-v2",
    ) ?? wallets[0];

  const [amountEth, setAmountEth] = useState("");
  const [recipient, setRecipient] = useState(initialRecipient);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [sendBusy, setSendBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
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
    setSendError(null);

    try {
      const amount = amountEth.trim();
      if (!amount || Number(amount) <= 0) {
        setSendError("Enter a valid amount.");
        return;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 400));

      if (mode === "transfer") {
        const trimmedRecipient = recipient.trim();
        if (!trimmedRecipient) {
          setSendError("Enter a recipient address or ENS name.");
          return;
        }
        if (!isValidRecipient(trimmedRecipient)) {
          setSendError("Enter a valid Ethereum address or ENS name.");
          return;
        }
        if (!wallet?.address) {
          setSendError("Your wallet is still loading.");
          return;
        }

        const transfer = sendEthOnChain(
          wallet.address,
          trimmedRecipient,
          amount,
        );
        setSendResult({
          kind: "transfer",
          amountEth: formatEther(BigInt(transfer.amountWei)),
          recipient: trimmedRecipient,
          toAddress: transfer.to,
        });
        onTransferred?.();
        return;
      }

      const code = generateGiftCode();
      const gift = saveGiftOnChain(code, amount);
      const link = `${window.location.origin}/?code=${encodeURIComponent(code)}`;

      setSendResult({
        kind: "gift",
        code,
        codeHash: gift.codeHash,
        amountEth: amount,
        link,
      });
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : "Could not complete send.",
      );
    } finally {
      setSendBusy(false);
    }
  }

  if (sendResult?.kind === "transfer") {
    return (
      <div className="flex flex-col gap-4 text-left">
        <div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Sent
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Transferred {sendResult.amountEth} ETH to {sendResult.recipient}
          </p>
          <p className="mt-1 truncate font-mono text-xs text-zinc-400">
            {sendResult.toAddress}
          </p>
        </div>
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

  if (sendResult?.kind === "gift") {
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
            setRecipient("");
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
      {mode === "transfer" ? (
        <label className="flex flex-col gap-2 text-left">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Recipient
          </span>
          <input
            type="text"
            name="recipient"
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            placeholder="0x… or name.eth"
            autoComplete="off"
            spellCheck={false}
            className={`${inputClassName} font-mono text-sm`}
          />
        </label>
      ) : null}

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

      {sendError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{sendError}</p>
      ) : null}

      <button
        type="submit"
        disabled={
          sendBusy ||
          !amountEth ||
          Number(amountEth) <= 0 ||
          (mode === "transfer" && !recipient.trim())
        }
        className={primaryButtonClassName}
      >
        {sendBusy
          ? mode === "transfer"
            ? "Sending…"
            : "Saving on chain…"
          : mode === "transfer"
            ? "Send ETH"
            : "Send"}
      </button>
    </form>
  );
}
