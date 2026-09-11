declare module "circomlibjs" {
  export function buildPoseidon(): Promise<
    ((inputs: (bigint | number | string)[]) => Uint8Array) & {
      F: { toString: (value: Uint8Array) => string };
    }
  >;
}
