import { homePath } from "@/lib/paths";

const DEFAULT_APP_URL = "https://gifty.energia.dev";

export function appOrigin() {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return window.location.origin;
  return DEFAULT_APP_URL;
}

export function giftLink(code: string) {
  return `${appOrigin()}${homePath(code)}`;
}
