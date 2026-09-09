import { isAddress, keccak256, parseEther, stringToBytes, type Hex } from "viem";

const GIFTS_KEY = "crypto-blick:mock-gifts";
const ENS_BY_ADDRESS_KEY = "crypto-blick:mock-ens-by-address";
const BALANCES_BY_ADDRESS_KEY = "crypto-blick:mock-balances-by-address";
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

export type MockTokenBalances = {
  ETH: string;
  USDC: string;
  USDT: string;
};

const EMPTY_BALANCES: MockTokenBalances = {
  ETH: "0",
  USDC: "0",
  USDT: "0",
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

function getBalancesByAddressMap() {
  return readJson<Record<string, MockTokenBalances>>(
    BALANCES_BY_ADDRESS_KEY,
    {},
  );
}

export function getBalancesByAddress(address: string): MockTokenBalances {
  const balances = getBalancesByAddressMap()[normalizeAddress(address)];
  return {
    ...EMPTY_BALANCES,
    ...balances,
  };
}

function setEthBalance(address: string, amountWei: string) {
  const normalized = normalizeAddress(address);
  const map = getBalancesByAddressMap();
  const balances = {
    ...EMPTY_BALANCES,
    ...map[normalized],
  };

  map[normalized] = {
    ...balances,
    ETH: amountWei,
  };
  writeJson(BALANCES_BY_ADDRESS_KEY, map);
}

function creditEthToAddress(address: string, amountWei: string) {
  const normalized = normalizeAddress(address);
  const current = getBalancesByAddress(normalized).ETH;
  setEthBalance(normalized, (BigInt(current) + BigInt(amountWei)).toString());
}

function debitEthFromAddress(address: string, amountWei: string) {
  const normalized = normalizeAddress(address);
  const current = BigInt(getBalancesByAddress(normalized).ETH);
  const amount = BigInt(amountWei);
  if (current < amount) {
    throw new Error("Insufficient ETH balance.");
  }
  setEthBalance(normalized, (current - amount).toString());
}

function creditGiftToAddress(address: string, gift: MockGift) {
  creditEthToAddress(address, gift.amountWei);
}

export function getAddressByEns(ens: string): string | null {
  const intended = ens.trim().toLowerCase();
  const entry = Object.entries(getEnsByAddressMap()).find(
    ([, value]) => value.toLowerCase() === intended,
  );
  return entry?.[0] ?? null;
}

/** Resolve an address or ENS name to a wallet address. */
export function resolveRecipientAddress(recipient: string): string {
  const trimmed = recipient.trim();
  if (!trimmed) {
    throw new Error("Enter a recipient address or ENS name.");
  }

  if (isAddress(trimmed)) {
    return normalizeAddress(trimmed);
  }

  const byEns = getAddressByEns(trimmed);
  if (!byEns) {
    throw new Error(`Could not resolve ${trimmed} to an address.`);
  }
  return byEns;
}

/** Direct ETH transfer on the mocked chain (no claim code). */
export function sendEthOnChain(
  fromAddress: string,
  recipient: string,
  amountEth: string,
): { from: string; to: string; amountWei: string } {
  const from = normalizeAddress(fromAddress);
  const to = resolveRecipientAddress(recipient);
  const amountWei = parseEther(amountEth).toString();

  if (from === to) {
    throw new Error("Cannot send ETH to yourself.");
  }

  if (BigInt(amountWei) <= BigInt(0)) {
    throw new Error("Enter a valid amount.");
  }

  debitEthFromAddress(from, amountWei);
  creditEthToAddress(to, amountWei);

  return { from, to, amountWei };
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

function markGiftClaimed(gift: MockGift) {
  const gifts = readJson<Record<string, MockGift>>(GIFTS_KEY, {});
  gifts[gift.codeHash] = {
    ...normalizeGift(gift),
    isClaimed: true,
  };
  writeJson(GIFTS_KEY, gifts);
}

function requireClaimableGift(code: string): MockGift {
  const gift = getGiftByCode(code);

  if (!gift) {
    throw new Error("Gift code was not found on chain.");
  }

  if (gift.isClaimed) {
    throw new Error("Gift code has already been claimed.");
  }

  return gift;
}

/** Claim a gift and register an ENS name for the wallet. */
export function claimGiftOnChain(
  code: string,
  label: string,
  address: string,
): { ens: string; codeHash: Hex } {
  const ens = toFullEns(label);
  const normalized = normalizeAddress(address);
  const gift = requireClaimableGift(code);

  if (!isEnsAvailable(label, normalized)) {
    throw new Error(`${ens} is already taken.`);
  }

  const map = getEnsByAddressMap();
  map[normalized] = ens;
  writeJson(ENS_BY_ADDRESS_KEY, map);

  markGiftClaimed(gift);
  creditGiftToAddress(normalized, gift);

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
