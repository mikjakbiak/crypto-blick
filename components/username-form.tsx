"use client";

import { useState, type FormEvent } from "react";
import { useWallets } from "@privy-io/react-auth";
import { usernameRegistrarAbi } from "@/lib/chain/abi";
import { publicContracts } from "@/lib/chain/config";
import {
  ensParent,
  isValidEnsLabel,
  normalizeEnsLabel,
  toFullUsername,
} from "@/lib/chain/ens";
import { walletClientFromPrivy } from "@/lib/chain/wallet";

type UsernameFormProps = {
  address: string;
  onRegistered: (ens: string) => void;
};

const inputClassName =
  "min-w-0 flex-1 bg-white px-4 text-base text-zinc-900 outline-none placeholder:text-zinc-400 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500";

const primaryButtonClassName =
  "min-h-12 w-full rounded-xl bg-teal-800 px-4 text-base font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-500 dark:text-zinc-950 dark:hover:bg-teal-400";

export default function UsernameForm({
  address,
  onRegistered,
}: UsernameFormProps) {
  const { wallets } = useWallets();
  const wallet =
    wallets.find(
      (candidate) => candidate.address.toLowerCase() === address.toLowerCase(),
    ) ?? wallets[0];
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const suffix = `.${ensParent()}`;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const normalized = normalizeEnsLabel(label);
      if (!isValidEnsLabel(normalized)) {
        setError("Username can’t contain dots or special characters.");
        return;
      }
      if (!wallet) {
        setError("Your wallet is still loading.");
        return;
      }

      const availableRes = await fetch(
        `/api/ens?available=${encodeURIComponent(normalized)}`,
      );
      const availableJson = (await availableRes.json()) as {
        available?: boolean;
      };
      if (!availableJson.available) {
        setError(`${toFullUsername(normalized)} is already taken.`);
        return;
      }

      const client = await walletClientFromPrivy(wallet);
      await client.writeContract({
        address: publicContracts().usernameRegistrar,
        abi: usernameRegistrarAbi,
        functionName: "register",
        args: [normalized, address as `0x${string}`],
      });
      onRegistered(toFullUsername(normalized));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not register username.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <label className="flex flex-col gap-2 text-left">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Choose your username
        </span>
        <div className="flex min-h-12 overflow-hidden rounded-xl border border-zinc-200 focus-within:ring-2 focus-within:ring-teal-500/40 dark:border-zinc-700">
          <input
            type="text"
            name="username"
            value={label}
            onChange={(event) =>
              setLabel(event.target.value.toLowerCase().replace(/\./g, ""))
            }
            placeholder="yourname"
            autoComplete="off"
            spellCheck={false}
            className={inputClassName}
          />
          <span className="flex shrink-0 items-center border-l border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
            {suffix}
          </span>
        </div>
      </label>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <button type="submit" disabled={busy} className={primaryButtonClassName}>
        {busy ? "Registering on Sepolia…" : "Continue"}
      </button>
    </form>
  );
}
