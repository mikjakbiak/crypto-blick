import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["snarkjs"],
  agentRules: false,
};

export default nextConfig;
