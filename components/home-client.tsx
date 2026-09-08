"use client";

import { useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import AccountMenu from "@/components/account-menu";
import GiftCard from "@/components/gift-card";
import {
  claimGiftOnChain,
  clearPendingClaim,
  getEnsByAddress,
  getPendingClaim,
} from "@/lib/mock-chain";

type HomeClientProps = {
  initialCode?: string;
};

export default function HomeClient({ initialCode }: HomeClientProps) {
  const { ready, authenticated } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const wallet = wallets[0];
  const [claimedEns, setClaimedEns] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;

    if (!authenticated) {
      setClaimedEns(null);
      return;
    }

    if (!walletsReady || !wallet?.address) return;

    const pending = getPendingClaim();
    if (pending) {
      try {
        const existing = getEnsByAddress(wallet.address);
        if (existing) {
          clearPendingClaim();
          setClaimedEns(existing);
          return;
        }

        const claim = claimGiftOnChain(
          pending.code,
          pending.label,
          wallet.address,
        );
        clearPendingClaim();
        setClaimedEns(claim.ens);
      } catch {
        clearPendingClaim();
        setClaimedEns(getEnsByAddress(wallet.address));
      }
      return;
    }

    setClaimedEns(getEnsByAddress(wallet.address));
  }, [ready, authenticated, walletsReady, wallet?.address]);

  const showAccount = Boolean(ready && authenticated && claimedEns);

  return (
    <div className="relative flex flex-1 flex-col">
      {showAccount ? (
        <div className="absolute top-4 right-4 z-10 sm:top-6 sm:right-6">
          <AccountMenu name={claimedEns!} />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <GiftCard
          initialCode={initialCode}
          onClaimed={setClaimedEns}
        />
      </div>
    </div>
  );
}
