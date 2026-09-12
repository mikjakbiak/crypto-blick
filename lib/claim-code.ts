import { extractGiftCode } from "@/lib/mock-chain";

const CLAIM_CODE_KEY = "crypto-blick:claim-code";

export function rememberClaimCode(code: string) {
  const trimmed = extractGiftCode(code);
  if (!trimmed || typeof window === "undefined") return;
  window.sessionStorage.setItem(CLAIM_CODE_KEY, trimmed);
}

export function readRememberedClaimCode() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(CLAIM_CODE_KEY)?.trim() ?? "";
}

export function forgetClaimCode() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(CLAIM_CODE_KEY);
}

export function resolveClaimCode(urlCode?: string | null) {
  const fromUrl = urlCode ? extractGiftCode(urlCode) : "";
  if (fromUrl) {
    rememberClaimCode(fromUrl);
    return fromUrl;
  }
  return readRememberedClaimCode();
}
