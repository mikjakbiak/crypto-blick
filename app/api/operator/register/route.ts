import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { usernameRegistrarAbi } from "@/lib/chain/abi";
import { publicContracts } from "@/lib/chain/config";
import { operatorClients, waitOperatorTx } from "@/lib/chain/operator";
import { isValidEnsLabel, normalizeEnsLabel } from "@/lib/chain/ens";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const record = body as { label?: unknown; owner?: unknown };
  const label =
    typeof record.label === "string" ? normalizeEnsLabel(record.label) : "";
  const owner =
    typeof record.owner === "string" ? record.owner.trim() : "";

  if (!isValidEnsLabel(label)) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }
  if (!isAddress(owner)) {
    return NextResponse.json({ error: "Invalid owner" }, { status: 400 });
  }

  try {
    const { publicClient, wallet } = operatorClients();
    const hash = await wallet.writeContract({
      address: publicContracts().usernameRegistrar,
      abi: usernameRegistrarAbi,
      functionName: "register",
      args: [label, owner],
    });
    await waitOperatorTx(publicClient, hash);
    return NextResponse.json({ hash });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
