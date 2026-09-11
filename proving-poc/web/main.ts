import { hashCode } from "../src/poseidon.ts";
import { fieldToAddress } from "../src/code.ts";
import { proveClaim } from "../src/prove.ts";
import { plonkProofToCalldata, type PlonkProof } from "../src/plonk.ts";
import { BOB } from "../src/vectors.ts";

type PlonkBrowser = {
  fullProve: (
    input: unknown,
    wasm: string | Uint8Array,
    zkey: string | Uint8Array,
  ) => Promise<{ proof: PlonkProof; publicSignals: string[] }>;
  verify: (vkey: unknown, publicSignals: string[], proof: PlonkProof) => Promise<boolean>;
};

declare global {
  interface Window {
    snarkjs: { plonk: PlonkBrowser };
  }
}

const plonk = window.snarkjs.plonk;
const form = document.querySelector<HTMLFormElement>("#form")!;
const statusEl = document.querySelector<HTMLElement>("#status")!;
const outEl = document.querySelector<HTMLPreElement>("#out")!;
const tamperBtn = document.querySelector<HTMLButtonElement>("#tamper")!;

let lastProof: Awaited<ReturnType<typeof proveClaim<PlonkProof>>> | null = null;
let vkey: unknown;

function setStatus(kind: "ok" | "bad", text: string) {
  statusEl.hidden = false;
  statusEl.className = `status ${kind}`;
  statusEl.textContent = text;
}

async function loadVkey() {
  if (vkey) return vkey;
  const res = await fetch("/verification_key.json");
  if (!res.ok) {
    throw new Error("Missing verification_key.json. Run bun run setup first.");
  }
  vkey = await res.json();
  return vkey;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  tamperBtn.disabled = true;
  lastProof = null;
  const code = new FormData(form).get("code")?.toString() ?? "";
  const claimant = new FormData(form).get("claimant")?.toString() ?? "";

  try {
    if (!window.snarkjs?.plonk) {
      throw new Error("snarkjs failed to load from /snarkjs.min.js.");
    }
    setStatus("ok", "Proving in this tab. The gift code is not uploaded.");
    await loadVkey();
    const expectedHash = await hashCode(code);
    const result = await proveClaim<PlonkProof>(
      plonk,
      { wasm: "/gift_claim.wasm", zkey: "/gift_claim.zkey" },
      code,
      claimant,
    );
    const verified = await plonk.verify(vkey, result.publicSignals, result.proof);
    if (!verified) throw new Error("Local PLONK verify returned false.");

    lastProof = result;
    tamperBtn.disabled = false;
    const proof = plonkProofToCalldata(result.proof);
    setStatus(
      "ok",
      `PLONK proof generated in ${Math.round(result.elapsedMs)} ms. Public outputs: hash=${result.codeHash} claimant=${fieldToAddress(result.claimant)}. Local verify=true. Code was not sent anywhere.`,
    );
    outEl.hidden = false;
    outEl.textContent = JSON.stringify(
      {
        protocol: "plonk",
        publicOutputs: {
          codeHash: result.codeHash.toString(),
          expectedPoseidon: expectedHash.toString(),
          claimant: fieldToAddress(result.claimant),
        },
        solidityArgs: {
          proof,
          publicSignals: result.publicSignals,
        },
        note: "Submit proof (uint256[24]) and publicSignals to GiftClaimer.claim. Never submit the code.",
      },
      null,
      2,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus("bad", message);
    outEl.hidden = true;
  }
});

tamperBtn.addEventListener("click", async () => {
  if (!lastProof) return;
  try {
    await loadVkey();
    const bobField = BigInt(BOB).toString();
    const tampered: [string, string] = [lastProof.publicSignals[0], bobField];
    const verified = await plonk.verify(vkey, tampered, lastProof.proof);
    setStatus(
      verified ? "bad" : "ok",
      verified
        ? "Unexpected: tampered claimant verified. Binding is broken."
        : `Replay failed as expected. Same proof + ${BOB} does not verify. On-chain GiftClaimer would revert InvalidProof.`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus("bad", message);
  }
});
