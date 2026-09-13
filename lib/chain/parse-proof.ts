import type { PlonkProofTuple } from "@/lib/zk/plonk";

function toBigInt(value: unknown, label: string): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isInteger(value)) return BigInt(value);
  if (typeof value === "string" && value.length > 0) return BigInt(value);
  throw new Error(`Invalid ${label}`);
}

export function parseProof(value: unknown): PlonkProofTuple {
  if (!Array.isArray(value) || value.length !== 24) {
    throw new Error("Proof must have 24 limbs.");
  }
  return value.map((item, i) => toBigInt(item, `proof[${i}]`)) as unknown as PlonkProofTuple;
}

export function parsePublicSignals(value: unknown): readonly [bigint, bigint] {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new Error("Public signals must have 2 values.");
  }
  return [toBigInt(value[0], "publicSignals[0]"), toBigInt(value[1], "publicSignals[1]")];
}
