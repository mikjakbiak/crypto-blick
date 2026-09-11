import { addressToField, codeToLimbs, toDecimal } from "./code.ts";
import { hashLimbs } from "./poseidon.ts";
import type { CircuitInput } from "./snark.ts";

export type ProveArtifacts = {
  wasm: Uint8Array | string;
  zkey: Uint8Array | string;
};

export type ProveResult<P = unknown> = {
  proof: P;
  publicSignals: [string, string];
  codeHash: bigint;
  claimant: bigint;
  elapsedMs: number;
};

type SnarkProveApi = {
  fullProve: (
    input: CircuitInput,
    wasm: Uint8Array | string,
    zkey: Uint8Array | string,
  ) => Promise<{ proof: unknown; publicSignals: string[] }>;
};

export function buildCircuitInput(code: string, claimant: string): CircuitInput {
  const limbs = codeToLimbs(code);
  return {
    code: [toDecimal(limbs[0]), toDecimal(limbs[1])],
    claimant: toDecimal(addressToField(claimant)),
  };
}

export async function proveClaim<P = unknown>(
  prover: SnarkProveApi,
  artifacts: ProveArtifacts,
  code: string,
  claimant: string,
): Promise<ProveResult<P>> {
  const input = buildCircuitInput(code, claimant);
  const expectedHash = hashLimbs(codeToLimbs(code));
  const started = performance.now();
  const { proof, publicSignals } = await prover.fullProve(
    input,
    artifacts.wasm,
    artifacts.zkey,
  );
  const elapsedMs = performance.now() - started;

  if (publicSignals.length !== 2) {
    throw new Error(`Circuit must expose 2 public signals, got ${publicSignals.length}.`);
  }

  const codeHash = BigInt(publicSignals[0]!);
  const claimantOut = BigInt(publicSignals[1]!);

  if (codeHash !== expectedHash) {
    throw new Error("Public code hash does not match Poseidon(code).");
  }
  if (claimantOut !== addressToField(claimant)) {
    throw new Error("Public claimant does not match the proving address.");
  }

  return {
    proof: proof as P,
    publicSignals: [publicSignals[0]!, publicSignals[1]!],
    codeHash,
    claimant: claimantOut,
    elapsedMs,
  };
}
