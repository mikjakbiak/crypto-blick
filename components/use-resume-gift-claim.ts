"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { claimGiftOnChain, getGiftByCode } from "@/lib/mock-chain";
import { forgetClaimCode, resolveClaimCode } from "@/lib/claim-code";
import { dashboardPath } from "@/lib/paths";

type ClaimStatus = "idle" | "claiming" | "claimed" | "error";

export default function useResumeGiftClaim(
  walletAddress: string | undefined,
  username: string | null,
) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCode = searchParams.get("code");
  const code = resolveClaimCode(rawCode);
  const [status, setStatus] = useState<ClaimStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const startedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!walletAddress || !username || !code) return;
    const key = `${walletAddress}:${code}`;
    if (startedFor.current === key) return;
    startedFor.current = key;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setStatus("claiming");
      setError(null);

      try {
        const existing = getGiftByCode(code);
        if (existing?.isClaimed) {
          forgetClaimCode();
          if (!cancelled) setStatus("claimed");
          router.replace(dashboardPath());
          return;
        }

        claimGiftOnChain(code, walletAddress);
        forgetClaimCode();
        if (!cancelled) setStatus("claimed");
        router.replace(dashboardPath());
      } catch (caught) {
        if (cancelled) return;
        setStatus("error");
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not claim this gift.",
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [walletAddress, username, code, router]);

  return { code, status, error };
}
