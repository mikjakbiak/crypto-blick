import { alchemySepoliaUrl } from "@/lib/chain/config";

export function sepoliaRpcUrl() {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) throw new Error("Missing ALCHEMY_API_KEY");
  return alchemySepoliaUrl(key);
}
