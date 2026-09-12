import { mkdir, readFile, writeFile, copyFile, access, stat, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { poseidon2 } from "poseidon-lite";
import { proveClaim, buildCircuitInput } from "../lib/zk/prove";
import { plonkProofToCalldata, type PlonkProof } from "../lib/zk/plonk";
import { toHex } from "../lib/zk/snark";
import { hashCode, hashLimbs } from "../lib/zk/poseidon";
import { codeToLimbs } from "../lib/zk/code";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARTIFACTS = path.join(ROOT, "artifacts");
const CIRCUIT = path.join(ROOT, "circuit", "gift_claim.circom");
const SNARKJS_CLI = path.join(ROOT, "node_modules", "snarkjs", "build", "cli.cjs");
const PTAU_POWER = 10;
const ALICE = "0x00000000000000000000000000000000000000a1";
const BOB = "0x00000000000000000000000000000000000000b2";
const DEMO_CODE = "demo-gift-code";

async function exists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function run(command: string, args: string[], cwd = ROOT) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited ${code}`));
    });
  });
}

function snarkjs(args: string[], inherit = true) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn("node", [SNARKJS_CLI, ...args], {
      cwd: ROOT,
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
      else reject(new Error(`snarkjs ${args.join(" ")} exited ${code}\n${stderr}`));
    });
  });
}

async function resolveCircom() {
  const candidates = [
    process.env.CIRCOM,
    path.join(ROOT, ".bin", "circom"),
    path.join(ROOT, "zk-wip", ".bin", "circom"),
    "circom",
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn(candidate, ["--version"], { stdio: "ignore" });
        child.on("error", reject);
        child.on("close", (code) => (code === 0 ? resolve() : reject(new Error("fail"))));
      });
      return candidate;
    } catch {
      // next
    }
  }
  throw new Error("circom not found. Put binary at .bin/circom or set CIRCOM.");
}

async function generatePtau(destination: string) {
  if (await exists(destination)) return;
  const ptau0 = path.join(ARTIFACTS, `pot${PTAU_POWER}_0000.ptau`);
  const ptau1 = path.join(ARTIFACTS, `pot${PTAU_POWER}_0001.ptau`);
  const entropy = randomBytes(32).toString("hex");
  await snarkjs(["powersoftau", "new", "bn128", String(PTAU_POWER), ptau0]);
  await snarkjs([
    "powersoftau",
    "contribute",
    ptau0,
    ptau1,
    "-n=crypto-blick",
    `-e=${entropy}`,
  ]);
  await snarkjs(["powersoftau", "prepare", "phase2", ptau1, destination]);
}

async function proveCli(wasm: string, zkey: string, code: string, claimant: string) {
  const input = buildCircuitInput(code, claimant);
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
  return { proof, publicSignals, elapsedMs };
}

async function writeFixture(
  name: string,
  wasm: string,
  zkey: string,
  code: string,
  claimant: string,
) {
  const raw = await proveCli(wasm, zkey, code, claimant);
  const result = await proveClaim(
    {
      fullProve: async () => ({
        proof: raw.proof,
        publicSignals: raw.publicSignals,
      }),
    },
    { wasm, zkey },
    code,
    claimant,
  );
  const limbs = plonkProofToCalldata(result.proof);
  const payload: Record<string, string | number | string[] | PlonkProof> = {
    code,
    claimant,
    elapsedMs: raw.elapsedMs,
    publicSignals: result.publicSignals,
    codeHash: toHex(result.codeHash),
    claimantField: toHex(result.claimant),
    proof: result.proof,
  };
  for (let i = 0; i < 24; i++) payload[`p${i}`] = limbs[i]!;
  await writeFile(
    path.join(ARTIFACTS, "fixtures", `${name}.json`),
    JSON.stringify(payload, null, 2),
  );
  return result;
}

async function main() {
  const circom = await resolveCircom();
  await mkdir(path.join(ARTIFACTS, "fixtures"), { recursive: true });
  await mkdir(path.join(ROOT, "public", "zk"), { recursive: true });
  await mkdir(path.join(ROOT, "contracts", "src"), { recursive: true });

  const limbs = codeToLimbs(DEMO_CODE);
  if (hashLimbs(limbs) !== poseidon2(limbs)) {
    throw new Error("Poseidon mismatch");
  }

  const buildDir = path.join(ARTIFACTS, "circuit");
  await rm(buildDir, { recursive: true, force: true });
  await mkdir(buildDir, { recursive: true });
  await run(circom, [
    CIRCUIT,
    "--r1cs",
    "--wasm",
    "--sym",
    "-l",
    path.join(ROOT, "node_modules"),
    "-o",
    buildDir,
  ]);

  const r1csPath = path.join(buildDir, "gift_claim.r1cs");
  const wasmPath = path.join(buildDir, "gift_claim_js", "gift_claim.wasm");
  const ptauPath = path.join(ARTIFACTS, `pot${PTAU_POWER}_final.ptau`);
  await generatePtau(ptauPath);

  const zkey = path.join(ARTIFACTS, "gift_claim.zkey");
  const vkeyPath = path.join(ARTIFACTS, "verification_key.json");
  const verifier = path.join(ROOT, "contracts", "src", "PlonkVerifier.sol");

  await snarkjs(["plonk", "setup", r1csPath, ptauPath, zkey]);
  await snarkjs(["zkey", "export", "verificationkey", zkey, vkeyPath]);
  await snarkjs(["zkey", "export", "solidityverifier", zkey, verifier]);

  let source = await readFile(verifier, "utf8");
  if (!source.includes("contract PlonkVerifier")) {
    source = source.replace(/contract \w+/, "contract PlonkVerifier");
    await writeFile(verifier, source);
  }

  await copyFile(wasmPath, path.join(ARTIFACTS, "gift_claim.wasm"));
  await copyFile(wasmPath, path.join(ROOT, "public", "zk", "gift_claim.wasm"));
  await copyFile(zkey, path.join(ROOT, "public", "zk", "gift_claim.zkey"));
  await copyFile(vkeyPath, path.join(ROOT, "public", "zk", "verification_key.json"));

  const alice = await writeFixture("alice", wasmPath, zkey, DEMO_CODE, ALICE);
  const bob = await writeFixture("bob", wasmPath, zkey, DEMO_CODE, BOB);
  if ((await hashCode(DEMO_CODE)) !== alice.codeHash) {
    throw new Error("Poseidon/circuit hash mismatch");
  }
  void bob;
  const zkeyBytes = (await stat(zkey)).size;
  console.log(JSON.stringify({ ok: true, zkeyBytes, protocol: "plonk" }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
