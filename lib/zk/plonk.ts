import { toHex } from "./snark";

export type PlonkProof = {
  A: string[];
  B: string[];
  C: string[];
  Z: string[];
  T1: string[];
  T2: string[];
  T3: string[];
  Wxi: string[];
  Wxiw: string[];
  eval_a: string;
  eval_b: string;
  eval_c: string;
  eval_s1: string;
  eval_s2: string;
  eval_zw: string;
  protocol: string;
  curve: string;
};

function g1(point: string[]): [string, string] {
  return [toHex(point[0]!), toHex(point[1]!)];
}

/** Flatten a snarkjs PLONK proof into the uint256[24] verifier calldata. */
export function plonkProofToCalldata(proof: PlonkProof): `0x${string}`[] {
  const parts = [
    ...g1(proof.A),
    ...g1(proof.B),
    ...g1(proof.C),
    ...g1(proof.Z),
    ...g1(proof.T1),
    ...g1(proof.T2),
    ...g1(proof.T3),
    ...g1(proof.Wxi),
    ...g1(proof.Wxiw),
    toHex(proof.eval_a),
    toHex(proof.eval_b),
    toHex(proof.eval_c),
    toHex(proof.eval_s1),
    toHex(proof.eval_s2),
    toHex(proof.eval_zw),
  ];
  if (parts.length !== 24) {
    throw new Error(`Expected 24 PLONK proof limbs, got ${parts.length}.`);
  }
  return parts as `0x${string}`[];
}

export type PlonkProofTuple = readonly [
  bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint,
  bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint,
  bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint,
];

export function plonkProofTuple(proof: PlonkProof): PlonkProofTuple {
  return plonkProofToCalldata(proof).map((value) => BigInt(value)) as unknown as PlonkProofTuple;
}
