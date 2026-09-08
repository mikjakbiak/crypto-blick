"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { mainnet, sepolia } from "viem/chains";

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const clientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;

export default function Providers({ children }: { children: React.ReactNode }) {
  if (!appId) {
    throw new Error("Missing NEXT_PUBLIC_PRIVY_APP_ID");
  }

  return (
    <PrivyProvider
      appId={appId}
      {...(clientId ? { clientId } : {})}
      config={{
        appearance: {
          walletChainType: "ethereum-only",
          landingHeader: "Create an account",
          loginMessage: "Create an account to claim your gift.",
        },
        defaultChain: sepolia,
        supportedChains: [mainnet, sepolia],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
