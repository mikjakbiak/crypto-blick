import { PrivyClient } from "@privy-io/node";

export function privyServer() {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim();
  const appSecret = process.env.PRIVY_APP_SECRET?.trim();
  if (!appId || !appSecret) {
    throw new Error("Missing NEXT_PUBLIC_PRIVY_APP_ID or PRIVY_APP_SECRET");
  }
  return new PrivyClient({ appId, appSecret });
}

export function accessTokenFromRequest(request: Request) {
  const header = request.headers.get("authorization")?.trim() ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() ?? "";
}

export function httpError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("Missing")
    ? 503
    : message.includes("access token") || message.includes("Unauthorized")
      ? 401
      : 502;
  return { message, status };
}

export async function embeddedWalletId(
  privy: PrivyClient,
  userId: string,
  address: string,
) {
  const user = await privy.users()._get(userId);
  const want = address.toLowerCase();
  for (const account of user.linked_accounts ?? []) {
    if (account.type !== "wallet") continue;
    if (!("address" in account) || typeof account.address !== "string") continue;
    if (account.address.toLowerCase() !== want) continue;
    if ("id" in account && typeof account.id === "string" && account.id) {
      return account.id;
    }
  }
  throw new Error("No Privy embedded wallet id for this address.");
}
