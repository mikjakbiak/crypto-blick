import { packetToBytes } from "viem/ens";
import { encodeFunctionData, hexToBytes, toHex } from "viem";
import { ensParentName, publicContracts, SEPOLIA_ENS_V2, usernameRegistrarAddresses } from "./config";
import { universalResolverAbi, usernameRegistrarAbi } from "./abi";
import { appPublicClient } from "./clients";

const ADDR_ABI = [
  {
    type: "function",
    name: "addr",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ type: "address" }],
  },
] as const;

export function normalizeEnsLabel(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

export function isValidEnsLabel(label: string) {
  if (!label || label.includes(".")) return false;
  return /^[a-z0-9-]{1,63}$/.test(label);
}

export function ensParent() {
  return ensParentName().replace(/^\./, "");
}

export function toFullUsername(label: string) {
  return `${normalizeEnsLabel(label)}.${ensParent()}`;
}

export function expandRecipientName(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes(".") || trimmed.startsWith("0x")) return trimmed;
  return toFullUsername(trimmed);
}

function dnsName(name: string) {
  return toHex(packetToBytes(name));
}

export async function resolveNameToAddress(rpcUrl: string, name: string) {
  const client = appPublicClient(rpcUrl);
  const data = encodeFunctionData({
    abi: ADDR_ABI,
    functionName: "addr",
    args: [
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    ],
  });

  const [result] = await client.readContract({
    address: SEPOLIA_ENS_V2.universalResolver,
    abi: universalResolverAbi,
    functionName: "resolve",
    args: [dnsName(name), data],
  });

  if (!result || result === "0x") return null;
  const bytes = hexToBytes(result);
  if (bytes.length < 20) return null;
  const address = toHex(bytes.slice(bytes.length - 20));
  if (address === "0x0000000000000000000000000000000000000000") return null;
  return address;
}

export async function usernameOf(rpcUrl: string, address: `0x${string}`) {
  const client = appPublicClient(rpcUrl);
  for (const registrar of usernameRegistrarAddresses()) {
    const label = await client.readContract({
      address: registrar,
      abi: usernameRegistrarAbi,
      functionName: "labelOf",
      args: [address],
    });
    if (label) return toFullUsername(label);
  }
  return null;
}

export async function isUsernameAvailable(rpcUrl: string, label: string) {
  const client = appPublicClient(rpcUrl);
  return client.readContract({
    address: publicContracts().usernameRegistrar,
    abi: usernameRegistrarAbi,
    functionName: "isAvailable",
    args: [normalizeEnsLabel(label)],
  });
}
