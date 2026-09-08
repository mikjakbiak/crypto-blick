"use client";

import { usePrivy } from "@privy-io/react-auth";

export default function LoginPrompt({
  title = "Finish signing in to claim your gift.",
}: {
  title?: string;
}) {
  const { ready, authenticated, login } = usePrivy();

  if (!ready) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
    );
  }

  if (authenticated) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        {title}
      </p>
      <button
        type="button"
        onClick={login}
        className="min-h-12 w-full rounded-xl border border-zinc-200 px-4 text-base font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
      >
        Open login again
      </button>
    </div>
  );
}
