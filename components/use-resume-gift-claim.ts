"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWallets } from "@privy-io/react-auth";
import { createPublicClient, http, parseEventLogs } from "viem";
import { plonk } from "snarkjs";
import { giftClaimerAbi } from "@/lib/chain/abi";
import { APP_CHAIN, publicContracts } from "@/lib/chain/config";
import { postSponsor, submitUserTxOrSponsor } from "@/lib/chain/submit";
import { walletClientFromPrivy } from "@/lib/chain/wallet";
import { forgetClaimCode, resolveClaimCode } from "@/lib/claim-code";
import { dashboardPath } from "@/lib/paths";
import { hashCode } from "@/lib/zk/poseidon";
import { plonkProofTuple } from "@/lib/zk/plonk";
import { proveClaim } from "@/lib/zk/prove";

export type ClaimStatus = "idle" | "claiming" | "claimed" | "error";

export default function useResumeGiftClaim(
  walletAddress: string | undefined,
  username: string | null,
  onClaimed?: () => void,
) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { wallets } = useWallets();
  const rawCode = searchParams.get("code");
  const code = resolveClaimCode(rawCode);
  const [status, setStatus] = useState<ClaimStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [paidWei, setPaidWei] = useState<bigint | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const startedFor = useRef<string | null>(null);

  const wallet = wallets.find(
    (candidate) =>
      candidate.address.toLowerCase() === (walletAddress ?? "").toLowerCase(),
  );

  useEffect(() => {
    if (!walletAddress || !username || !code || !wallet) return;
    const key = `${walletAddress}:${code}`;
    if (startedFor.current === key) return;
    startedFor.current = key;

    const claimantWallet = wallet;
    const claimCode = code;
    const claimant = walletAddress;

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
          setPaidWei(existing[1]);
          setCelebrate(false);
          setStatus("claimed");
          onClaimed?.();
          forgetClaimCode();
          router.replace(dashboardPath());
          return;
        }

        const proved = await proveClaim(
          plonk,
          { wasm: "/zk/gift_claim.wasm", zkey: "/zk/gift_claim.zkey" },
          claimCode,
          claimant,
        );
        const proof = plonkProofTuple(proved.proof);
        const publicSignals = [
          BigInt(proved.publicSignals[0]),
          BigInt(proved.publicSignals[1]),
        ] as const;
        const { hash } = await submitUserTxOrSponsor({
          account: claimant as `0x${string}`,
          sendSelf: async () => {
            const client = await walletClientFromPrivy(claimantWallet);
            return client.writeContract({
              address: publicContracts().giftClaimer,
              abi: giftClaimerAbi,
              functionName: "claim",
              args: [proof, publicSignals],
            });
          },
          sponsor: () =>
            postSponsor("/api/operator/claim", {
              proof: proof.map(String),
              publicSignals: publicSignals.map(String),
            }),
        });

        const receipt = await publicClient.getTransactionReceipt({ hash });
        const claimedLogs = parseEventLogs({
          abi: giftClaimerAbi,
          eventName: "GiftClaimed",
          logs: receipt.logs,
        });
        const paid = claimedLogs[0]?.args.paid ?? existing[1];
        setPaidWei(paid);
        setCelebrate(true);
        setStatus("claimed");
        onClaimed?.();
        forgetClaimCode();
        router.replace(dashboardPath());
      } catch (caught) {
        startedFor.current = null;
        setStatus("error");
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not claim this gift.",
        );
      }
    }

    void run();
  }, [walletAddress, username, code, wallet, router, onClaimed]);

  return { code, status, error, paidWei, celebrate };
}
