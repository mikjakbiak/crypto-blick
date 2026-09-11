import { mkdir, readFile, writeFile, copyFile, access, stat, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPoseidon } from "circomlibjs";
import { poseidon2 } from "poseidon-lite";
import { proveClaimCli, snarkjs, verifyCli } from "../src/cli.ts";
import { plonkProofToCalldata } from "../src/plonk.ts";
import { toHex } from "../src/snark.ts";
import { ALICE, BOB, DEMO_CODE } from "../src/vectors.ts";
import { hashCode, hashLimbs } from "../src/poseidon.ts";
import { codeToLimbs, fieldToAddress } from "../src/code.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARTIFACTS = path.join(ROOT, "artifacts");
const CIRCUIT = path.join(ROOT, "circuit", "gift_claim.circom");
const PTAU_POWER = 10;

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
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited ${code}`));
    });
  });
}

async function resolveCircom() {
  const candidates = [
    process.env.CIRCOM,
    path.join(ROOT, ".bin", "circom"),
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
      // try next
    }
  }

  throw new Error("circom not found. Put a binary at zk-wip/.bin/circom or set CIRCOM.");
}

async function generatePtau(destination: string) {
  if (await exists(destination)) {
    console.log(`ptau cache hit: ${destination}`);
    return;
  }

  const ptau0 = path.join(ARTIFACTS, `pot${PTAU_POWER}_0000.ptau`);
  const ptau1 = path.join(ARTIFACTS, `pot${PTAU_POWER}_0001.ptau`);
  const entropy = randomBytes(32).toString("hex");
  console.log(`Generating local Powers of Tau 2^${PTAU_POWER} via node snarkjs (POC ceremony)`);
  await snarkjs(["powersoftau", "new", "bn128", String(PTAU_POWER), ptau0]);
  await snarkjs(["powersoftau", "contribute", ptau0, ptau1, "-n=crypto-blick-poc", `-e=${entropy}`]);
  await snarkjs(["powersoftau", "prepare", "phase2", ptau1, destination]);
}

async function assertHashersMatch() {
  const limbs = codeToLimbs(DEMO_CODE);
  const lite = poseidon2(limbs);
  const circomlib = await buildPoseidon();
  const reference = BigInt(circomlib.F.toString(circomlib(limbs)));
  if (lite !== reference || hashLimbs(limbs) !== reference) {
    throw new Error(`Poseidon mismatch: lite=${lite} circomlibjs=${reference}`);
  }
}

async function writeFixture(name: string, wasm: string, zkey: string, code: string, claimant: string) {
  const result = await proveClaimCli(wasm, zkey, code, claimant);
  const limbs = plonkProofToCalldata(result.proof);
  const payload: Record<string, string | number | string[] | typeof result.proof> = {
    code,
    claimant,
    elapsedMs: result.elapsedMs,
    publicSignals: result.publicSignals,
    codeHash: toHex(result.codeHash),
    claimantField: toHex(result.claimant),
    proof: result.proof,
  };
  for (let i = 0; i < 24; i++) {
    payload[`p${i}`] = limbs[i]!;
  }
  await writeFile(path.join(ARTIFACTS, "fixtures", `${name}.json`), JSON.stringify(payload, null, 2));
  return result;
}

async function main() {
  const circom = await resolveCircom();
  console.log(`circom: ${circom}`);

  await mkdir(path.join(ARTIFACTS, "fixtures"), { recursive: true });
  await mkdir(path.join(ROOT, "web", "public"), { recursive: true });
  await mkdir(path.join(ROOT, "contracts", "src"), { recursive: true });
  await assertHashersMatch();

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

  console.log("PLONK setup (universal ptau, no circuit-specific MPC)");
  await snarkjs(["r1cs", "info", r1csPath]);
  await snarkjs(["plonk", "setup", r1csPath, ptauPath, zkey]);
  await snarkjs(["zkey", "export", "verificationkey", zkey, vkeyPath]);
  await snarkjs(["zkey", "export", "solidityverifier", zkey, verifier]);

  let source = await readFile(verifier, "utf8");
  if (!source.includes("contract PlonkVerifier")) {
    source = source.replace(/contract \w+/, "contract PlonkVerifier");
    await writeFile(verifier, source);
  }

  await copyFile(wasmPath, path.join(ARTIFACTS, "gift_claim.wasm"));
  await copyFile(wasmPath, path.join(ROOT, "web", "public", "gift_claim.wasm"));
  await copyFile(zkey, path.join(ROOT, "web", "public", "gift_claim.zkey"));
  await copyFile(vkeyPath, path.join(ROOT, "web", "public", "verification_key.json"));
  await copyFile(
    path.join(ROOT, "node_modules", "snarkjs", "build", "snarkjs.min.js"),
    path.join(ROOT, "web", "public", "snarkjs.min.js"),
  );

  const alice = await writeFixture("alice", wasmPath, zkey, DEMO_CODE, ALICE);
  const bob = await writeFixture("bob", wasmPath, zkey, DEMO_CODE, BOB);

  const aliceOk = await verifyCli(vkeyPath, alice.publicSignals, alice.proof);
  const bobOk = await verifyCli(vkeyPath, bob.publicSignals, bob.proof);
  const swapped = await verifyCli(vkeyPath, [alice.publicSignals[0], bob.publicSignals[1]], alice.proof);
  const zkeyBytes = (await stat(zkey)).size;

  const summary = {
    protocol: "plonk",
    zkeyBytes,
    codeHash: alice.codeHash.toString(),
    alice: fieldToAddress(alice.claimant),
    bob: fieldToAddress(bob.claimant),
    poseidonMatches: (await hashCode(DEMO_CODE)) === alice.codeHash,
    aliceVerify: aliceOk,
    bobVerify: bobOk,
    aliceProofWithBobAddress: swapped,
    aliceProveMs: alice.elapsedMs,
    bobProveMs: bob.elapsedMs,
  };
  await writeFile(path.join(ARTIFACTS, "setup-summary.json"), JSON.stringify(summary, null, 2));
  console.log(summary);

  if (!aliceOk || !bobOk || swapped !== false || !summary.poseidonMatches) {
    throw new Error("Setup self-check failed.");
  }

  console.log("Setup complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
