export type PortfolioToken = {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  rawBalance: string;
  kind: "native" | "erc20";
  contractAddress?: string;
  /** Mainnet USD price per token, or null when Alchemy has no quote. */
  priceUsd: number | null;
  logo?: string | null;
};

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

export function formatUsdOrUnavailable(amount: number | null) {
  return amount == null ? "US$ —" : formatUsd(amount);
}
