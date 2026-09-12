import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { sepoliaRpcUrl } from "@/lib/chain/server-rpc";
import {
  expandRecipientName,
  isUsernameAvailable,
  isValidEnsLabel,
  normalizeEnsLabel,
  resolveNameToAddress,
  usernameOf,
} from "@/lib/chain/ens";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const address = url.searchParams.get("address")?.trim() ?? "";
  const name = url.searchParams.get("name")?.trim() ?? "";
  const label = url.searchParams.get("available")?.trim() ?? "";
  const rpc = sepoliaRpcUrl();

  try {
    if (address) {
      if (!isAddress(address)) {
        return NextResponse.json({ error: "Invalid address" }, { status: 400 });
      }
      const ens = await usernameOf(rpc, address);
      return NextResponse.json({ ens });
    }

    if (label) {
      const normalized = normalizeEnsLabel(label);
      if (!isValidEnsLabel(normalized)) {
        return NextResponse.json({ available: false });
      }
      const available = await isUsernameAvailable(rpc, normalized);
      return NextResponse.json({ available });
    }

    if (name) {
      if (isAddress(name)) {
        return NextResponse.json({ address: name });
      }
      const resolved = await resolveNameToAddress(rpc, expandRecipientName(name));
      if (!resolved) {
        return NextResponse.json({ error: "Name not found" }, { status: 404 });
      }
      return NextResponse.json({ address: resolved });
    }

    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ENS lookup failed" },
      { status: 502 },
    );
  }
}
