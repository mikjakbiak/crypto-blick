export const LIMB_BYTES = 31;
export const NUM_LIMBS = 2;
export const MAX_CODE_BYTES = LIMB_BYTES * NUM_LIMBS;

const ADDRESS_RE = /^0x[0-9a-f]{40}$/;

export function codeToLimbs(code: string): [bigint, bigint] {
  const bytes = new TextEncoder().encode(code);
  if (bytes.length === 0) {
    throw new Error("Gift code is empty.");
  }
  if (bytes.length > MAX_CODE_BYTES) {
    throw new Error(`Gift code longer than ${MAX_CODE_BYTES} UTF-8 bytes.`);
  }

  const limbs: bigint[] = [];
  for (let i = 0; i < NUM_LIMBS; i++) {
    const start = i * LIMB_BYTES;
    const chunk = bytes.subarray(start, start + LIMB_BYTES);
    let value = 0n;
    for (const byte of chunk) {
      value = (value << 8n) | BigInt(byte);
    }
    limbs.push(value);
  }

  return [limbs[0]!, limbs[1]!];
}

export function addressToField(address: string): bigint {
  const normalized = address.trim().toLowerCase();
  if (!ADDRESS_RE.test(normalized)) {
    throw new Error("Claimant must be a 20-byte 0x-prefixed address.");
  }
  return BigInt(normalized);
}

export function fieldToAddress(value: bigint): string {
  if (value < 0n || value >= 1n << 160n) {
    throw new Error("Public claimant is not a 160-bit address.");
  }
  return `0x${value.toString(16).padStart(40, "0")}`;
}

export function toDecimal(value: bigint): string {
  return value.toString(10);
}

export function extractGiftCode(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const queryIndex = trimmed.indexOf("?");
  if (queryIndex !== -1) {
    const fromQuery = new URLSearchParams(trimmed.slice(queryIndex + 1)).get(
      "code",
    );
    if (fromQuery?.trim()) return fromQuery.trim();
  }

  return trimmed;
}

export function generateGiftCode() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
