"use client";

import isPropValid from "@emotion/is-prop-valid";
import { PrivyProvider } from "@privy-io/react-auth";
import { StyleSheetManager } from "styled-components";
import { sepolia } from "viem/chains";
import { silencePrivyIsActiveWarning } from "@/lib/silence-privy-isactive-warning";

silencePrivyIsActiveWarning();

function shouldForwardProp(propName: string) {
  return propName !== "isActive";
}

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const clientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;

function shouldForwardProp(propName: string, target: unknown) {
  if (typeof target === "string") {
    return isPropValid(propName);
  }
  return true;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  if (!appId) {
    throw new Error("Missing NEXT_PUBLIC_PRIVY_APP_ID");
  }

  return (
    <StyleSheetManager shouldForwardProp={shouldForwardProp}>
      <PrivyProvider
        appId={appId}
        {...(clientId ? { clientId } : {})}
        config={{
          appearance: {
            walletChainType: "ethereum-only",
            landingHeader: "Crypto Blick",
            loginMessage: "Log in or create an account.",
          },
          defaultChain: sepolia,
          supportedChains: [sepolia],
          embeddedWallets: {
            ethereum: {
              createOnLogin: "users-without-wallets",
            },
          },
        }}
      >
        {children}
      </PrivyProvider>
    </StyleSheetManager>
  );
}
