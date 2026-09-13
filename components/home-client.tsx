"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import LandingPage from "@/components/landing-page";
import { resolveClaimCode } from "@/lib/claim-code";
import { dashboardPath } from "@/lib/paths";

type HomeClientProps = {
  initialCode?: string;
};

export default function HomeClient({ initialCode }: HomeClientProps) {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();
  const wasAuthenticated = useRef<boolean | null>(null);

  useEffect(() => {
    if (!ready) return;
    const code = initialCode ?? resolveClaimCode();

    if (wasAuthenticated.current === null) {
      wasAuthenticated.current = authenticated;
      if (authenticated && code) {
        router.replace(dashboardPath(code));
      }
      return;
    }

    if (!wasAuthenticated.current && authenticated) {
      router.replace(dashboardPath(code));
    }
    wasAuthenticated.current = authenticated;
  }, [ready, authenticated, initialCode, router]);

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-8 text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  return <LandingPage initialCode={initialCode} />;
}
