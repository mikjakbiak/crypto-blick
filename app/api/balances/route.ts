import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { SEPOLIA_TOKEN_ADDRESSES } from "@/lib/chain/config";
import { sepoliaRpcUrl } from "@/lib/chain/server-rpc";

type AlchemyTokenBalance = {
  contractAddress: string;
  tokenBalance: string | null;
};

async function alchemy(method: string, params: unknown[]) {
  const res = await fetch(sepoliaRpcUrl(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = (await res.json()) as { result?: unknown; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address")?.trim() ?? "";
  if (!isAddress(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    const [ethHex, tokenResult] = await Promise.all([
      alchemy("eth_getBalance", [address, "latest"]) as Promise<string>,
      alchemy("alchemy_getTokenBalances", [
        address,
        [SEPOLIA_TOKEN_ADDRESSES.USDC, SEPOLIA_TOKEN_ADDRESSES.USDT],
      ]) as Promise<{ tokenBalances: AlchemyTokenBalance[] }>,
    ]);

    const byAddress = new Map(
      (tokenResult.tokenBalances ?? []).map((row) => [
        row.contractAddress.toLowerCase(),
        BigInt(row.tokenBalance ?? "0x0").toString(),
      ]),
    );

    return NextResponse.json({
      ETH: BigInt(ethHex).toString(),
      USDC: byAddress.get(SEPOLIA_TOKEN_ADDRESSES.USDC.toLowerCase()) ?? "0",
      USDT: byAddress.get(SEPOLIA_TOKEN_ADDRESSES.USDT.toLowerCase()) ?? "0",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not read Sepolia balances",
      },
      { status: 502 },
    );
  }
}
