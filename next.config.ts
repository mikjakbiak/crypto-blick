import type { NextConfig } from "next";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://auth.privy.io https://*.privy.io https://explorer-api.walletconnect.com https://*.stripe.com",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "child-src https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org",
  "frame-src https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org https://challenges.cloudflare.com https://js.stripe.com https://hooks.stripe.com",
  "connect-src 'self' https://auth.privy.io https://api.privy.io https://api.relay.link https://api.testnets.relay.link https://*.stripe.com wss://relay.walletconnect.com wss://relay.walletconnect.org wss://www.walletlink.org https://*.rpc.privy.systems https://explorer-api.walletconnect.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
]
  .join("; ")
  .replace(/\s+/g, " ");

const nextConfig: NextConfig = {
  serverExternalPackages: ["snarkjs", "@privy-io/node"],
  agentRules: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
