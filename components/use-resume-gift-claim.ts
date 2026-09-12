"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWallets } from "@privy-io/react-auth";
import { createPublicClient, http } from "viem";
import { plonk } from "snarkjs";
import { giftClaimerAbi } from "@/lib/chain/abi";
import { APP_CHAIN, publicContracts } from "@/lib/chain/config";
import { walletClientFromPrivy } from "@/lib/chain/wallet";
import { forgetClaimCode, resolveClaimCode } from "@/lib/claim-code";
import { dashboardPath } from "@/lib/paths";
import { hashCode } from "@/lib/zk/poseidon";
import { plonkProofTuple } from "@/lib/zk/plonk";
import { proveClaim } from "@/lib/zk/prove";

type ClaimStatus = "idle" | "claiming" | "claimed" | "error";

export default function useResumeGiftClaim(
  walletAddress: string | undefined,
  username: string | null,
) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { wallets } = useWallets();
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

    const wallet = wallets.find(
      (candidate) =>
        candidate.address.toLowerCase() === walletAddress.toLowerCase(),
    );
    if (!wallet) return;

    const claimantWallet = wallet;
    const claimCode = code;
    const claimant = walletAddress;
    let cancelled = false;

    async function run() {
      setStatus("claiming");
      setError(null);
      try {
        const publicClient = createPublicClient({
          chain: APP_CHAIN,
          transport: http("/api/rpc"),
        });
        const existing = await publicClient.readContract({
          address: publicContracts().giftClaimer,
          abi: giftClaimerAbi,
          functionName: "gifts",
          args: [hashCode(claimCode)],
        });
        if (existing[0] === "0x0000000000000000000000000000000000000000") {
          throw new Error("Gift code was not found on chain.");
        }
        if (existing[2]) {
          forgetClaimCode();
          if (!cancelled) setStatus("claimed");
          router.replace(dashboardPath());
          return;
        }

        const proved = await proveClaim(
          plonk,
          { wasm: "/zk/gift_claim.wasm", zkey: "/zk/gift_claim.zkey" },
          claimCode,
          claimant,
        );
        const client = await walletClientFromPrivy(claimantWallet);
        await client.writeContract({
          address: publicContracts().giftClaimer,
          abi: giftClaimerAbi,
          functionName: "claim",
          args: [
            plonkProofTuple(proved.proof),
            [BigInt(proved.publicSignals[0]), BigInt(proved.publicSignals[1])],
          ],
        });
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
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [walletAddress, username, code, router, wallets]);

  return { code, status, error };
}
