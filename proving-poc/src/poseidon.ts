import { poseidon2 } from "poseidon-lite";
import { codeToLimbs } from "./code.ts";

export function hashLimbs(limbs: [bigint, bigint]): bigint {
  return poseidon2(limbs);
}

export async function hashCode(code: string): Promise<bigint> {
  return hashLimbs(codeToLimbs(code));
}
