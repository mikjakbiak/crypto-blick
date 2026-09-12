declare module "snarkjs" {
  export const plonk: {
    fullProve: (
      input: unknown,
      wasm: Uint8Array | string,
      zkey: Uint8Array | string,
    ) => Promise<{ proof: unknown; publicSignals: string[] }>;
    verify: (
      vkey: unknown,
      publicSignals: string[],
      proof: unknown,
    ) => Promise<boolean>;
  };
}
