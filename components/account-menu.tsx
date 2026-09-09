"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { formatTokenAmount } from "@/lib/tokens";

type AccountMenuProps = {
  name: string;
  ethBalance: number;
};

export default function AccountMenu({ name, ethBalance }: AccountMenuProps) {
  const router = useRouter();
  const { logout } = usePrivy();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  async function handleLogout() {
    setOpen(false);
    await logout();
    router.replace("/");
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex max-w-[min(100vw-2rem,18rem)] items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-left text-sm shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="truncate font-medium text-zinc-900 dark:text-zinc-50">
          {name}
        </span>
        <span className="shrink-0 text-zinc-400">·</span>
        <span className="shrink-0 font-mono text-zinc-600 dark:text-zinc-400">
          {formatTokenAmount(ethBalance, 4)} ETH
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 min-w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-950"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="block w-full px-4 py-2.5 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
