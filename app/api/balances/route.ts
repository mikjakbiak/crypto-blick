import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { baseRpcUrl } from "@/lib/chain/server-rpc";
import { getPortfolioUsdPrices } from "@/lib/prices";
import type { PortfolioToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

type AlchemyTokenBalance = {
  contractAddress: string;
  tokenBalance: string | null;
};

type AlchemyTokenBalancesResult = {
  tokenBalances?: AlchemyTokenBalance[];
  pageKey?: string;
};

type AlchemyTokenMetadata = {
  name?: string | null;
  symbol?: string | null;
  decimals?: number | null;
  logo?: string | null;
};

function tokenLogoUrl(value: string | null | undefined) {
  const logo = value?.trim();
  if (!logo) return null;
  try {
    const url = new URL(logo);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

const METADATA_CONCURRENCY = 8;

async function alchemy(method: string, params: unknown[]) {
  const res = await fetch(baseRpcUrl(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = (await res.json()) as {
    result?: unknown;
    error?: { message: string };
  };
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

function parseRawBalance(value: string | null | undefined) {
  try {
    return BigInt(value && value !== "0x" ? value : "0x0");
  } catch {
    return 0n;
  }
}

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

async function getErc20Balances(address: string) {
  const rows: AlchemyTokenBalance[] = [];
  let pageKey: string | undefined;

  do {
    const options: { maxCount: number; pageKey?: string } = { maxCount: 100 };
    if (pageKey) options.pageKey = pageKey;

    const result = (await alchemy("alchemy_getTokenBalances", [
      address,
      "erc20",
      options,
    ])) as AlchemyTokenBalancesResult;

    rows.push(...(result.tokenBalances ?? []));
    pageKey = result.pageKey;
  } while (pageKey);

  return rows.filter((row) => parseRawBalance(row.tokenBalance) !== 0n);
}

async function getTokenMetadata(contractAddress: string) {
  try {
    return (await alchemy("alchemy_getTokenMetadata", [
      contractAddress,
    ])) as AlchemyTokenMetadata;
  } catch {
    return {};
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address")?.trim() ?? "";
  if (!isAddress(address)) {
    return NextResponse.json(
      { error: "Invalid address" },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const [ethHex, erc20Rows] = await Promise.all([
      alchemy("eth_getBalance", [address, "latest"]) as Promise<string>,
      getErc20Balances(address),
    ]);

    const ethRaw = parseRawBalance(ethHex).toString();
    const tokens: PortfolioToken[] = [
      {
        id: "native",
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
        rawBalance: ethRaw,
        kind: "native",
        priceUsd: null,
      },
    ];

    const metadata = await mapWithConcurrency(
      erc20Rows,
      METADATA_CONCURRENCY,
      (row) => getTokenMetadata(row.contractAddress),
    );

    for (const [index, row] of erc20Rows.entries()) {
      const meta = metadata[index] ?? {};
      const contractAddress = row.contractAddress;
      tokens.push({
        id: contractAddress.toLowerCase(),
        symbol: meta.symbol?.trim() || shortenAddress(contractAddress),
        name: meta.name?.trim() || meta.symbol?.trim() || "Token",
        decimals:
          typeof meta.decimals === "number" &&
          Number.isInteger(meta.decimals) &&
          meta.decimals >= 0 &&
          meta.decimals <= 36
            ? meta.decimals
            : 18,
        rawBalance: parseRawBalance(row.tokenBalance).toString(),
        kind: "erc20",
        contractAddress,
        priceUsd: null,
        logo: tokenLogoUrl(meta.logo),
      });
    }

    try {
      const { ethUsd, erc20Usd } = await getPortfolioUsdPrices(tokens);
      for (const token of tokens) {
        if (token.kind === "native") {
          token.priceUsd = ethUsd;
        } else if (token.contractAddress) {
          token.priceUsd =
            erc20Usd.get(token.contractAddress.toLowerCase()) ?? null;
        }
      }
    } catch {
      // Keep balances even if the Prices API is unavailable.
    }

    return NextResponse.json(
      {
        nativeRawBalance: ethRaw,
        tokens,
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not read Base balances",
      },
      { status: 502, headers: NO_STORE },
    );
  }
}
