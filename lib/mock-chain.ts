import { keccak256, parseEther, stringToBytes, type Hex } from "viem";

const GIFTS_KEY = "crypto-blick:mock-gifts";
const ENS_BY_ADDRESS_KEY = "crypto-blick:mock-ens-by-address";
const PENDING_CLAIM_KEY = "crypto-blick:pending-claim";

export const ENS_SUFFIX = ".gift.eth";
export const HARDCODED_TEST_CODE = "1234";

export type MockGift = {
  codeHash: Hex;
  amountWei: string;
  createdAt: number;
  isClaimed: boolean;
};

export type PendingClaim = {
  code: string;
  label: string;
};

function canUseStorage() {
  return typeof window !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeAddress(address: string) {
  return address.toLowerCase();
}

function getHardcodedTestGift(): MockGift {
  const codeHash = hashGiftCode(HARDCODED_TEST_CODE);
  return {
    codeHash,
    amountWei: parseEther("0.01").toString(),
    createdAt: 0,
    isClaimed: false,
  };
}

function normalizeGift(gift: MockGift): MockGift {
  return {
    ...gift,
    isClaimed: gift.isClaimed ?? false,
  };
}

function getGiftsOnChain(): Record<string, MockGift> {
  const stored = readJson<Record<string, MockGift>>(GIFTS_KEY, {});
  const gifts = Object.fromEntries(
    Object.entries(stored).map(([key, gift]) => [key, normalizeGift(gift)]),
  );
  const hardcoded = getHardcodedTestGift();
  return {
    ...gifts,
    [hardcoded.codeHash]: gifts[hardcoded.codeHash] ?? hardcoded,
  };
}

export function generateGiftCode() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function hashGiftCode(code: string): Hex {
  return keccak256(stringToBytes(code.trim()));
}

export function saveGiftOnChain(code: string, amountEth: string): MockGift {
  const codeHash = hashGiftCode(code);
  const gift: MockGift = {
    codeHash,
    amountWei: parseEther(amountEth).toString(),
    createdAt: Date.now(),
    isClaimed: false,
  };

  const gifts = readJson<Record<string, MockGift>>(GIFTS_KEY, {});
  gifts[codeHash] = gift;
  writeJson(GIFTS_KEY, gifts);

  return gift;
}

export function isGiftHashOnChain(code: string): boolean {
  return getGiftByCode(code) !== null;
}

export function getGiftByCode(code: string): MockGift | null {
  const codeHash = hashGiftCode(code);
  return getGiftsOnChain()[codeHash] ?? null;
}

export function normalizeEnsLabel(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

export function isValidEnsLabel(label: string) {
  if (!label) return false;
  if (label.includes(".")) return false;
  return /^[a-z0-9-]+$/.test(label);
}

export function toFullEns(label: string) {
  return `${normalizeEnsLabel(label)}${ENS_SUFFIX}`;
}

function getEnsByAddressMap() {
  return readJson<Record<string, string>>(ENS_BY_ADDRESS_KEY, {});
}

export function getEnsByAddress(address: string): string | null {
  return getEnsByAddressMap()[normalizeAddress(address)] ?? null;
}

export function isEnsAvailable(label: string, forAddress?: string) {
  const ens = toFullEns(label);
  const map = getEnsByAddressMap();
  const owner = Object.entries(map).find(([, value]) => value === ens);
  if (!owner) return true;
  if (forAddress && owner[0] === normalizeAddress(forAddress)) return true;
  return false;
}

export function claimGiftOnChain(
  code: string,
  label: string,
  address: string,
): { ens: string; codeHash: Hex } {
  const ens = toFullEns(label);
  const normalized = normalizeAddress(address);
  const gift = getGiftByCode(code);

  if (!gift) {
    throw new Error("Gift code was not found on chain.");
  }

  if (gift.isClaimed) {
    throw new Error("Gift code has already been claimed.");
  }

  if (!isEnsAvailable(label, normalized)) {
    throw new Error(`${ens} is already taken.`);
  }

  const map = getEnsByAddressMap();
  map[normalized] = ens;
  writeJson(ENS_BY_ADDRESS_KEY, map);

  const gifts = readJson<Record<string, MockGift>>(GIFTS_KEY, {});
  gifts[gift.codeHash] = {
    ...normalizeGift(gift),
    isClaimed: true,
  };
  writeJson(GIFTS_KEY, gifts);

  return { ens, codeHash: gift.codeHash };
}

export function savePendingClaim(claim: PendingClaim) {
  writeJson(PENDING_CLAIM_KEY, claim);
}

export function getPendingClaim(): PendingClaim | null {
  return readJson<PendingClaim | null>(PENDING_CLAIM_KEY, null);
}

export function clearPendingClaim() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(PENDING_CLAIM_KEY);
}
