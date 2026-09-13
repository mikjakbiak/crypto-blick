const PRICE_BATCH_SIZE = 25;
const PRICE_NETWORK = "eth-mainnet";

type AlchemyPriceQuote = {
  currency?: string;
  value?: string;
};

type AlchemySymbolPrice = {
  symbol?: string;
  prices?: AlchemyPriceQuote[];
  error?: unknown;
};

type AlchemyAddressPrice = {
  network?: string;
  address?: string;
  prices?: AlchemyPriceQuote[];
  error?: unknown;
};

function alchemyApiKey() {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) throw new Error("Missing ALCHEMY_API_KEY");
  return key;
}

function usdFromQuotes(prices: AlchemyPriceQuote[] | undefined, error: unknown) {
  if (error) return null;
  const usd = prices?.find(
    (quote) => quote.currency?.toLowerCase() === "usd" && quote.value,
  );
  if (!usd?.value) return null;
  const amount = Number(usd.value);
  return Number.isFinite(amount) ? amount : null;
}

async function getEthUsdPrice() {
  const key = alchemyApiKey();
  const url = new URL(
    `https://api.g.alchemy.com/prices/v1/${key}/tokens/by-symbol`,
  );
  url.searchParams.append("symbols", "ETH");

  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: AlchemySymbolPrice[] };
  const row =
    json.data?.find((item) => item.symbol?.toUpperCase() === "ETH") ??
    json.data?.[0];
  return usdFromQuotes(row?.prices, row?.error);
}

async function getMainnetTokenUsdPrices(addresses: string[]) {
  const prices = new Map<string, number>();
  if (addresses.length === 0) return prices;

  const key = alchemyApiKey();
  const unique = [...new Set(addresses.map((address) => address.toLowerCase()))];

  for (let i = 0; i < unique.length; i += PRICE_BATCH_SIZE) {
    const batch = unique.slice(i, i + PRICE_BATCH_SIZE);
    try {
      const res = await fetch(
        `https://api.g.alchemy.com/prices/v1/${key}/tokens/by-address`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            addresses: batch.map((address) => ({
              network: PRICE_NETWORK,
              address,
            })),
          }),
        },
      );
      if (!res.ok) continue;
      const json = (await res.json()) as { data?: AlchemyAddressPrice[] };
      for (const row of json.data ?? []) {
        const address = row.address?.toLowerCase();
        const usd = usdFromQuotes(row.prices, row.error);
        if (address && usd != null) prices.set(address, usd);
      }
    } catch {
      // Ignore unpriced / unsupported tokens (typical on Sepolia).
    }
  }

  return prices;
}

export async function getPortfolioUsdPrices(tokens: {
  kind: "native" | "erc20";
  contractAddress?: string;
}[]) {
  const [ethUsd, erc20Usd] = await Promise.all([
    getEthUsdPrice().catch(() => null),
    getMainnetTokenUsdPrices(
      tokens
        .filter((token) => token.kind === "erc20" && token.contractAddress)
        .map((token) => token.contractAddress as string),
    ),
  ]);

  return { ethUsd, erc20Usd };
}
