const KEY = "crypto-blick:sent-gift-codes";
const EVENT = "crypto-blick:sent-gift-codes";

export type SentGiftCode = {
  codeHash: string;
  code: string;
  createdAt: number;
};

function canUseStorage() {
  return typeof window !== "undefined";
}

function readAll(): Record<string, SentGiftCode[]> {
  if (!canUseStorage()) return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, SentGiftCode[]>;
  } catch {
    return {};
  }
}

function writeAll(value: Record<string, SentGiftCode[]>) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(KEY, JSON.stringify(value));
  window.dispatchEvent(new Event(EVENT));
}

export function rememberSentGiftCode(
  sender: string,
  gift: SentGiftCode,
) {
  const map = readAll();
  const key = sender.toLowerCase();
  const list = map[key] ?? [];
  map[key] = [gift, ...list.filter((item) => item.codeHash !== gift.codeHash)];
  writeAll(map);
}

export function sentGiftCodesFor(sender: string): SentGiftCode[] {
  return readAll()[sender.toLowerCase()] ?? [];
}

export function subscribeSentGiftCodes(onChange: () => void) {
  if (!canUseStorage()) return () => {};
  function onStorage(event: StorageEvent) {
    if (event.key === KEY) onChange();
  }
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function sentGiftCodesSnapshot() {
  if (!canUseStorage()) return "{}";
  return window.localStorage.getItem(KEY) ?? "{}";
}

export function serverSentGiftCodesSnapshot() {
  return "{}";
}
