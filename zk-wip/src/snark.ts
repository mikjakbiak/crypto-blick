export type CircuitInput = {
  code: [string, string];
  claimant: string;
};

export function toHex(value: string | bigint): string {
  const asBig = typeof value === "bigint" ? value : BigInt(value);
  return `0x${asBig.toString(16).padStart(64, "0")}`;
}
