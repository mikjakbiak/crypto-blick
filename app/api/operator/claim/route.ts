import { NextResponse } from "next/server";
import { giftyClaimerAbi } from "@/lib/chain/abi";
import { MONEY_CHAIN, moneyContracts } from "@/lib/chain/config";
import { operatorClients, waitOperatorTx } from "@/lib/chain/operator";
import { parseProof, parsePublicSignals } from "@/lib/chain/parse-proof";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const record = body as { proof?: unknown; publicSignals?: unknown };

  try {
    const proof = parseProof(record.proof);
    const publicSignals = parsePublicSignals(record.publicSignals);
    const { publicClient, wallet } = operatorClients(MONEY_CHAIN);
    const hash = await wallet.writeContract({
      address: moneyContracts().giftyClaimer,
      abi: giftyClaimerAbi,
      functionName: "claimFor",
      args: [proof, publicSignals],
    });
    await waitOperatorTx(publicClient, hash);
    return NextResponse.json({ hash });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Claim failed";
    const status = message.startsWith("Invalid") || message.startsWith("Proof")
      ? 400
      : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
