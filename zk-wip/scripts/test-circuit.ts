import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { proveClaimCli, verifyCli } from "../src/cli.ts";
import { ALICE, BOB, DEMO_CODE } from "../src/vectors.ts";
import { addressToField } from "../src/code.ts";
import { hashCode } from "../src/poseidon.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const wasm = path.join(ROOT, "artifacts", "gift_claim.wasm");
  const zkey = path.join(ROOT, "artifacts", "gift_claim.zkey");
  const vkey = path.join(ROOT, "artifacts", "verification_key.json");
  await access(wasm);

  const alice = await proveClaimCli(wasm, zkey, DEMO_CODE, ALICE);
  const bob = await proveClaimCli(wasm, zkey, DEMO_CODE, BOB);

  assert(await verifyCli(vkey, alice.publicSignals, alice.proof), "Alice proof must verify");
  assert(await verifyCli(vkey, bob.publicSignals, bob.proof), "Bob proof must verify");

  const aliceHash = await hashCode(DEMO_CODE);
  assert(alice.codeHash === aliceHash, "Alice public hash must equal Poseidon(code)");
  assert(bob.codeHash === aliceHash, "Same code must produce the same public hash");
  assert(alice.claimant === addressToField(ALICE), "Alice public claimant mismatch");
  assert(bob.claimant === addressToField(BOB), "Bob public claimant mismatch");
  assert(alice.claimant !== bob.claimant, "Different claimants must appear in public signals");

  const replayOnBob = await verifyCli(vkey, [alice.publicSignals[0], bob.publicSignals[1]], alice.proof);
  assert(replayOnBob === false, "Alice proof must not verify with Bob's address");

  const replayOnAlice = await verifyCli(vkey, [bob.publicSignals[0], alice.publicSignals[1]], bob.proof);
  assert(replayOnAlice === false, "Bob proof must not verify with Alice's address");

  const wrongCode = await proveClaimCli(wasm, zkey, "other-secret-code", ALICE);
  assert(wrongCode.codeHash !== alice.codeHash, "Different codes must hash differently");

  const longCode = "a".repeat(32);
  const longProof = await proveClaimCli(wasm, zkey, longCode, ALICE);
  assert(longProof.codeHash !== alice.codeHash, "32-byte app-style codes must prove");
  assert(await verifyCli(vkey, longProof.publicSignals, longProof.proof), "32-byte code proof must verify");

  console.log(
    JSON.stringify(
      {
        ok: true,
        codeHash: alice.codeHash.toString(),
        aliceProveMs: Math.round(alice.elapsedMs),
        bobProveMs: Math.round(bob.elapsedMs),
        publicSignals: ["codeHash", "claimant"],
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
