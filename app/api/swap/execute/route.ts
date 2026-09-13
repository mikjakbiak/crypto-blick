import { NextResponse } from "next/server";
import {
  accessTokenFromRequest,
  embeddedWalletId,
  httpError,
  privyServer,
} from "@/lib/privy/server";
import { parseSwapBody } from "@/lib/privy/swap";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const token = accessTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Missing access token" }, { status: 401 });
    }

    const swap = parseSwapBody(body);
    const privy = privyServer();
    const claims = await privy.utils().auth().verifyAccessToken(token);
    const walletId = await embeddedWalletId(privy, claims.user_id, swap.address);
    const started = await privy.wallets().swaps().execute(walletId, {
      source: swap.source,
      destination: swap.destination,
      base_amount: swap.baseAmount,
      amount_type: "exact_input",
      authorization_context: { user_jwts: [token] },
    });

    const deadline = Date.now() + 45_000;
    let status = started.status;
    while (
      Date.now() < deadline &&
      status !== "succeeded" &&
      status !== "rejected" &&
      status !== "failed"
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const action = await privy.wallets().actions.get(started.id, {
        wallet_id: walletId,
      });
      status = action.status;
    }

    if (status !== "succeeded") {
      return NextResponse.json(
        {
          error:
            status === "pending"
              ? "Swap is still confirming. Refresh balances in a moment."
              : `Swap ${status}.`,
          status,
          actionId: started.id,
        },
        { status: status === "pending" ? 202 : 502 },
      );
    }

    return NextResponse.json({ status, actionId: started.id });
  } catch (error) {
    const parsed =
      error instanceof Error &&
      (error.message.startsWith("Choose") ||
        error.message.startsWith("Enter") ||
        error.message.startsWith("Invalid"))
        ? { message: error.message, status: 400 }
        : httpError(error, "Could not execute this swap");
    return NextResponse.json({ error: parsed.message }, { status: parsed.status });
  }
}
