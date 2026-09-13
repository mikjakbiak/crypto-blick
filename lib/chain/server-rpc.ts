import { alchemyBaseUrl, alchemySepoliaUrl } from "@/lib/chain/config";

function alchemyKey() {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) throw new Error("Missing ALCHEMY_API_KEY");
  return key;
}

export function sepoliaRpcUrl() {
  return alchemySepoliaUrl(alchemyKey());
}

export function baseRpcUrl() {
  return alchemyBaseUrl(alchemyKey());
}
