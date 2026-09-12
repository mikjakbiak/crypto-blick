import { poseidon2 } from "poseidon-lite";
import { codeToLimbs } from "./code";

export function hashLimbs(limbs: [bigint, bigint]): bigint {
  return poseidon2(limbs);
}

export function hashCode(code: string): bigint {
  return hashLimbs(codeToLimbs(code));
}
