export type TokenDefinition = {
  symbol: string;
  name: string;
  decimals: number;
  /** Display USD price used for portfolio totals. */
  priceUsd: number;
  kind: "native" | "erc20";
};

/** Tokens shown on the dashboard. Balances come from Alchemy on Sepolia. */
export const DASHBOARD_TOKENS: TokenDefinition[] = [
  {
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    priceUsd: 3450,
    kind: "native",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    priceUsd: 1,
    kind: "erc20",
  },
  {
    symbol: "USDT",
    name: "Tether",
    decimals: 6,
    priceUsd: 1,
    kind: "erc20",
  },
];

export function formatTokenAmount(amount: number, maximumFractionDigits = 6) {
  if (amount === 0) return "0";
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
}

export function formatUsd(amount: number) {
  return amount.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
