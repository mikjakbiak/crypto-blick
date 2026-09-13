import { sepolia } from "viem/chains";

export const APP_CHAIN = sepolia;

export const SEPOLIA_ENS_V2 = {
  universalResolver: "0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe",
  ethRegistry: "0xBDC85dD5b15D7ecb354cd7cb6f2c50b4f2c4F0E2",
  ethRegistrar: "0xa88553F454b77203B0D036A05c894d555EAAa2Cc",
  verifiableFactory: "0x10dC6333CDFe1FCEf624c6e0a8221b91804Cd7ef",
  userRegistryImpl: "0x624a25d67B59D587752EbEc8DdeD8827dAe52050",
  permissionedResolverImpl: "0x9EAe5C2730a7dD16BDD1DeE6421a1B91e3B0365e",
  mockUsdc: "0x768F42455A2D082E23ceeF7d51e5787C82d67a39",
} as const;

export const SEPOLIA_TOKEN_ADDRESSES = {
  USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  USDT: "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
} as const;

export function alchemySepoliaUrl(apiKey: string) {
  return `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`;
}

export function requireAddress(value: string | undefined, name: string) {
  if (!value || !/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw new Error(`Missing ${name}`);
  }
  return value as `0x${string}`;
}

export function ensParentName() {
  return process.env.NEXT_PUBLIC_ENS_PARENT?.trim() || "gift.eth";
}

export function publicContracts() {
  return {
    giftClaimer: requireAddress(
      process.env.NEXT_PUBLIC_GIFT_CLAIMER,
      "NEXT_PUBLIC_GIFT_CLAIMER",
    ),
    usernameRegistrar: requireAddress(
      process.env.NEXT_PUBLIC_USERNAME_REGISTRAR,
      "NEXT_PUBLIC_USERNAME_REGISTRAR",
    ),
    ensParent: ensParentName(),
  };
}

export function usernameRegistrarAddresses() {
  const current = requireAddress(
    process.env.NEXT_PUBLIC_USERNAME_REGISTRAR,
    "NEXT_PUBLIC_USERNAME_REGISTRAR",
  );
  const previous = (process.env.NEXT_PUBLIC_PREVIOUS_USERNAME_REGISTRARS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is `0x${string}` => /^0x[0-9a-fA-F]{40}$/.test(value));
  return [current, ...previous.filter((value) => value.toLowerCase() !== current.toLowerCase())];
}
