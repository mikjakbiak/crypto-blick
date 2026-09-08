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
        },
        defaultChain: sepolia,
        supportedChains: [mainnet, sepolia],
        // Create embedded wallets for users who don't have a wallet
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
