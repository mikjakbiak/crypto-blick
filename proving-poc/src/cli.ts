import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { addressToField, codeToLimbs } from "./code.ts";
import { hashLimbs } from "./poseidon.ts";
import type { PlonkProof } from "./plonk.ts";
import { buildCircuitInput } from "./prove.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SNARKJS_CLI = path.join(ROOT, "node_modules", "snarkjs", "build", "cli.cjs");

export function runNode(args: string[], cwd = ROOT, inherit = true) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn("node", args, {
      cwd,
      stdio: inherit ? "inherit" : ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    if (!inherit) {
      child.stdout?.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`node ${args.join(" ")} exited ${code}\n${stderr}`));
    });
  });
}

export function snarkjs(args: string[], inherit = true) {
  return runNode([SNARKJS_CLI, ...args], ROOT, inherit);
}

export type CliProveResult = {
  proof: PlonkProof;
  publicSignals: [string, string];
  codeHash: bigint;
  claimant: bigint;
  elapsedMs: number;
};

export async function proveClaimCli(
  wasm: string,
  zkey: string,
  code: string,
  claimant: string,
): Promise<CliProveResult> {
  const input = buildCircuitInput(code, claimant);
  const expectedHash = hashLimbs(codeToLimbs(code));
  const dir = await mkdtemp(path.join(tmpdir(), "blick-prove-"));
  const inputPath = path.join(dir, "input.json");
  const proofPath = path.join(dir, "proof.json");
  const publicPath = path.join(dir, "public.json");
  await writeFile(inputPath, JSON.stringify(input));

  const started = performance.now();
  await snarkjs(["pkf", inputPath, wasm, zkey, proofPath, publicPath]);
  const elapsedMs = performance.now() - started;

  const proof = JSON.parse(await readFile(proofPath, "utf8")) as PlonkProof;
  const publicSignals = JSON.parse(await readFile(publicPath, "utf8")) as string[];
  await rm(dir, { recursive: true, force: true });

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
    proof,
    publicSignals: [publicSignals[0]!, publicSignals[1]!],
    codeHash,
    claimant: claimantOut,
    elapsedMs,
  };
}

export async function verifyCli(
  vkeyPath: string,
  publicSignals: string[],
  proof: PlonkProof,
): Promise<boolean> {
  const dir = await mkdtemp(path.join(tmpdir(), "blick-verify-"));
  const proofPath = path.join(dir, "proof.json");
  const publicPath = path.join(dir, "public.json");
  await writeFile(proofPath, JSON.stringify(proof));
  await writeFile(publicPath, JSON.stringify(publicSignals));
  try {
    await snarkjs(["pkv", vkeyPath, publicPath, proofPath], false);
    await rm(dir, { recursive: true, force: true });
    return true;
  } catch {
    await rm(dir, { recursive: true, force: true });
    return false;
  }
}
