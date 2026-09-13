import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { BASE_USDC } from "@/lib/chain/config";
import { baseRpcUrl } from "@/lib/chain/server-rpc";

type AlchemyTokenBalance = {
  contractAddress: string;
  tokenBalance: string | null;
};

async function alchemy(method: string, params: unknown[]) {
  const res = await fetch(baseRpcUrl(), {
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
      alchemy("alchemy_getTokenBalances", [address, [BASE_USDC]]) as Promise<{
        tokenBalances: AlchemyTokenBalance[];
      }>,
    ]);

    const usdc =
      tokenResult.tokenBalances?.find(
        (row) => row.contractAddress.toLowerCase() === BASE_USDC.toLowerCase(),
      )?.tokenBalance ?? "0x0";

    return NextResponse.json({
      ETH: BigInt(ethHex).toString(),
      USDC: BigInt(usdc).toString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not read Base balances",
      },
      { status: 502 },
    );
  }
}
