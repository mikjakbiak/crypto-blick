"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPublicClient, formatEther, http, parseAbiItem } from "viem";
import { giftClaimerAbi } from "@/lib/chain/abi";
import { APP_CHAIN, publicContracts } from "@/lib/chain/config";
import { homePath } from "@/lib/paths";
import {
  sentGiftCodesFor,
  sentGiftCodesSnapshot,
  serverSentGiftCodesSnapshot,
  subscribeSentGiftCodes,
} from "@/lib/sent-gifts";

type ChainGift = {
  codeHash: `0x${string}`;
  amountWei: bigint;
  sender: `0x${string}`;
  claimed: boolean;
};

type SentGiftsListProps = {
  walletAddress: string;
};

function giftLink(code: string) {
  if (typeof window === "undefined") return homePath(code);
  return `${window.location.origin}${homePath(code)}`;
}

function formatWhen(createdAt: number) {
  if (!createdAt) return "On chain";
  return new Date(createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function GiftRow({
  gift,
  code,
  createdAt,
}: {
  gift: ChainGift;
  code?: string;
  createdAt: number;
}) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  async function copy(value: string, kind: "code" | "link") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  }

  return (
    <li className="flex flex-col gap-3 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            {formatEther(gift.amountWei)} ETH
          </p>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            {formatWhen(createdAt)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            gift.claimed
              ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              : "bg-teal-50 text-teal-900 dark:bg-teal-950/60 dark:text-teal-200"
          }`}
        >
          {gift.claimed ? "Claimed" : "Unclaimed"}
        </span>
      </div>

      {code ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copy(code, "code")}
            className="min-h-10 rounded-xl border border-zinc-200 px-3 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            {copied === "code" ? "Copied code" : "Copy code"}
          </button>
          <button
            type="button"
            onClick={() => copy(giftLink(code), "link")}
            className="min-h-10 rounded-xl border border-zinc-200 px-3 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            {copied === "link" ? "Copied link" : "Copy link"}
          </button>
        </div>
      ) : (
        <p className="font-mono text-xs text-zinc-400">{gift.codeHash}</p>
      )}
    </li>
  );
}

export default function SentGiftsList({ walletAddress }: SentGiftsListProps) {
  const snapshot = useSyncExternalStore(
    subscribeSentGiftCodes,
    sentGiftCodesSnapshot,
    serverSentGiftCodesSnapshot,
  );
  const local = sentGiftCodesFor(walletAddress);
  const [chainGifts, setChainGifts] = useState<ChainGift[]>([]);
  void snapshot;

  useEffect(() => {
    const client = createPublicClient({
      chain: APP_CHAIN,
      transport: http("/api/rpc"),
    });
    let cancelled = false;
    async function load() {
      const logs = await client.getLogs({
        address: publicContracts().giftClaimer,
        event: parseAbiItem(
          "event GiftCreated(uint256 indexed codeHash, address indexed sender, uint256 amount)",
        ),
        args: { sender: walletAddress as `0x${string}` },
        fromBlock: 0n,
      });
      const gifts = await Promise.all(
        logs.map(async (log) => {
          const codeHash = log.args.codeHash!;
          const onChain = await client.readContract({
            address: publicContracts().giftClaimer,
            abi: giftClaimerAbi,
            functionName: "gifts",
            args: [codeHash],
          });
          return {
            codeHash: `0x${codeHash.toString(16).padStart(64, "0")}` as `0x${string}`,
            amountWei: onChain[1],
            sender: onChain[0],
            claimed: onChain[2],
          };
        }),
      );
      if (!cancelled) setChainGifts(gifts);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [walletAddress, snapshot]);

  const localByHash = new Map(local.map((item) => [item.codeHash.toLowerCase(), item]));

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Sent gifts
      </h2>
      {chainGifts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          No gifts sent yet.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-900 dark:border-zinc-800 dark:bg-zinc-950">
          {chainGifts.map((gift) => {
            const localGift = localByHash.get(gift.codeHash.toLowerCase());
            return (
              <GiftRow
                key={gift.codeHash}
                gift={gift}
                code={localGift?.code}
                createdAt={localGift?.createdAt ?? 0}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}
