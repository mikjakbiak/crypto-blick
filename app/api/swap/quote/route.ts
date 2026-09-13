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
    const quote = await privy.wallets().swaps().quote(walletId, {
      source: swap.source,
      destination: swap.destination,
      base_amount: swap.baseAmount,
      amount_type: "exact_input",
    });

    return NextResponse.json({
      from: swap.from,
      to: swap.to,
      inputAmount: quote.input_amount,
      outputAmount: quote.est_output_amount,
      minimumOutputAmount: quote.minimum_output_amount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const parsed =
      message.startsWith("Choose") ||
      message.startsWith("Enter") ||
      message.startsWith("Invalid")
        ? { message, status: 400 }
        : httpError(error, "Could not quote this swap");
    return NextResponse.json({ error: parsed.message }, { status: parsed.status });
  }
}
