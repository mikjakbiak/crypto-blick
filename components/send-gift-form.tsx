"use client";

import { useState, type FormEvent } from "react";
import { useWallets } from "@privy-io/react-auth";
import { createPublicClient, http, isAddress, parseEther, type Hash } from "viem";
import { giftClaimerAbi } from "@/lib/chain/abi";
import { APP_CHAIN, publicContracts } from "@/lib/chain/config";
import { privyChainClients, publicClientFromPrivy } from "@/lib/chain/wallet";
import { generateGiftCode } from "@/lib/zk/code";
import { hashCode } from "@/lib/zk/poseidon";
import { toHex } from "@/lib/zk/snark";
import { rememberSentGiftCode } from "@/lib/sent-gifts";

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
  "min-h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base text-zinc-900 outline-none ring-teal-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500";

const primaryButtonClassName =
  "min-h-12 w-full rounded-xl bg-teal-800 px-4 text-base font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-500 dark:text-zinc-950 dark:hover:bg-teal-400";

function isValidRecipient(value: string) {
  return isAddress(value) || /^[a-z0-9-]+(?:\.[a-z0-9-]+)*$/i.test(value);
}

function hashFromUnknown(value: unknown): Hash | undefined {
  if (typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value)) {
    return value as Hash;
  }
  if (!value || typeof value !== "object") return undefined;
  if ("hash" in value) return hashFromUnknown(value.hash);
  if ("transactionHash" in value) return hashFromUnknown(value.transactionHash);
  if ("cause" in value) return hashFromUnknown(value.cause);
  return undefined;
}

async function waitForGiftReceipt(
  providerClient: Awaited<ReturnType<typeof publicClientFromPrivy>>,
  hash: Hash,
) {
  try {
    return await providerClient.waitForTransactionReceipt({
      hash,
      timeout: 120_000,
    });
  } catch {
    const rpcClient = createPublicClient({
      chain: APP_CHAIN,
      transport: http("/api/rpc"),
    });
    return rpcClient.waitForTransactionReceipt({
      hash,
      timeout: 120_000,
    });
  }
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
      if (!wallet?.address) {
        setSendError("Your wallet is still loading.");
        return;
      }

      const { walletClient: client, publicClient } =
        await privyChainClients(wallet);

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

        const lookup = await fetch(
          `/api/ens?name=${encodeURIComponent(trimmedRecipient)}`,
        );
        const resolved = (await lookup.json()) as {
          address?: string;
          error?: string;
        };
        if (!lookup.ok || !resolved.address) {
          throw new Error(resolved.error ?? "Could not resolve recipient.");
        }

        await client.sendTransaction({
          to: resolved.address as `0x${string}`,
          value: parseEther(amount),
        });
        setSendResult({
          kind: "transfer",
          amountEth: amount,
          recipient: trimmedRecipient,
          toAddress: resolved.address,
        });
        onTransferred?.();
        return;
      }

      const code = generateGiftCode();
      const codeHash = hashCode(code);
      const finishGift = () => {
        rememberSentGiftCode(wallet.address, {
          codeHash: toHex(codeHash),
          code,
          createdAt: Date.now(),
        });
        setSendResult({
          kind: "gift",
          code,
          codeHash: toHex(codeHash),
          amountEth: amount,
          link: `${window.location.origin}/?code=${encodeURIComponent(code)}`,
        });
        onTransferred?.();
      };

      let hash: Hash | undefined;
      try {
        hash = await client.writeContract({
          address: publicContracts().giftClaimer,
          abi: giftClaimerAbi,
          functionName: "createGift",
          args: [codeHash],
          value: parseEther(amount),
        });
      } catch (error) {
        hash = hashFromUnknown(error);
        if (!hash) throw error;
      }

      let receipt;
      try {
        receipt = await waitForGiftReceipt(publicClient, hash);
      } catch (error) {
        console.error("Could not confirm gift receipt", error);
        finishGift();
        return;
      }

      if (receipt.status !== "success") {
        throw new Error("Gift lock reverted on Sepolia.");
      }

      finishGift();
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
            Sent on Sepolia
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
            Gift locked on Sepolia
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
            placeholder="username, name.eth, or 0x…"
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
            ? "Sending on Sepolia…"
            : "Locking on Sepolia…"
          : mode === "transfer"
            ? "Send ETH"
            : "Send"}
      </button>
    </form>
  );
}
