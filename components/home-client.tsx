"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    if (!ready || !authenticated) return;
    router.replace(dashboardPath(initialCode ?? resolveClaimCode()));
  }, [ready, authenticated, initialCode, router]);

  if (!ready || authenticated) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-8 text-sm text-zinc-500">
        {authenticated ? "Taking you to your dashboard…" : "Loading…"}
      </div>
    );
  }

  return <LandingPage initialCode={initialCode} />;
}
