import { spawn } from "node:child_process";
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  type Abi,
  type Address,
} from "viem";
import { foundry } from "viem/chains";
import { proveClaimCli } from "../src/cli.ts";
import { plonkProofToCalldata } from "../src/plonk.ts";
import { BOB, DEMO_CODE } from "../src/vectors.ts";
import { hashCode } from "../src/poseidon.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ANVIL_PORT = 8546;
const ANVIL_RPC = `http://127.0.0.1:${ANVIL_PORT}`;

async function exists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function waitForRpc() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(ANVIL_RPC, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      });
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("anvil RPC not reachable");
}

async function loadArtifact(name: string) {
  const filePath = path.join(ROOT, "contracts", "out", `${name}.sol`, `${name}.json`);
  if (!(await exists(filePath))) {
    throw new Error(`Missing ${filePath}. Run bun run setup && forge build --root contracts`);
  }
  return JSON.parse(await readFile(filePath, "utf8")) as {
    abi: Abi;
    bytecode: { object: `0x${string}` };
  };
}

async function main() {
  const wasm = path.join(ROOT, "artifacts", "gift_claim.wasm");
  const zkey = path.join(ROOT, "artifacts", "gift_claim.zkey");

  const anvil = spawn("anvil", ["--port", String(ANVIL_PORT), "--silent"], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    await waitForRpc();

    const publicClient = createPublicClient({
      chain: foundry,
      transport: http(ANVIL_RPC),
    });
    const [sender] = (await publicClient.request({ method: "eth_accounts" })) as Address[];
    if (!sender) throw new Error("anvil returned no accounts");

    const wallet = createWalletClient({
      account: sender,
      chain: foundry,
      transport: http(ANVIL_RPC),
    });

    const verifierArt = await loadArtifact("PlonkVerifier");
    const claimerArt = await loadArtifact("GiftClaimer");

    const verifierHash = await wallet.deployContract({
      abi: verifierArt.abi,
      bytecode: verifierArt.bytecode.object,
    });
    const verifierReceipt = await publicClient.waitForTransactionReceipt({ hash: verifierHash });
    const verifierAddress = verifierReceipt.contractAddress;
    if (!verifierAddress) throw new Error("Verifier deploy failed");

    const claimerHash = await wallet.deployContract({
      abi: claimerArt.abi,
      bytecode: claimerArt.bytecode.object,
      args: [verifierAddress],
    });
    const claimerReceipt = await publicClient.waitForTransactionReceipt({ hash: claimerHash });
    const claimerAddress = claimerReceipt.contractAddress;
    if (!claimerAddress) throw new Error("GiftClaimer deploy failed");

    const codeHash = await hashCode(DEMO_CODE);
    const createHash = await wallet.writeContract({
      address: claimerAddress,
      abi: claimerArt.abi,
      functionName: "createGift",
      args: [codeHash],
      value: parseEther("1"),
    });
    await publicClient.waitForTransactionReceipt({ hash: createHash });

    const proved = await proveClaimCli(wasm, zkey, DEMO_CODE, sender);
    const proof = plonkProofToCalldata(proved.proof);
    const publicSignals: [string, string] = proved.publicSignals;

    const claimTx = await wallet.writeContract({
      address: claimerAddress,
      abi: claimerArt.abi,
      functionName: "claim",
      args: [proof, publicSignals],
    });
    const claimReceipt = await publicClient.waitForTransactionReceipt({ hash: claimTx });

    const bobProof = await proveClaimCli(wasm, zkey, DEMO_CODE, BOB);
    const swappedSignals: [string, string] = [publicSignals[0], bobProof.publicSignals[1]];

    let swapFailed = false;
    try {
      await publicClient.simulateContract({
        account: BOB as `0x${string}`,
        address: claimerAddress,
        abi: claimerArt.abi,
        functionName: "claim",
        args: [proof, swappedSignals],
      });
    } catch {
      swapFailed = true;
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          protocol: "plonk",
          verifier: verifierAddress,
          giftClaimer: claimerAddress,
          claimant: sender,
          claimGas: Number(claimReceipt.gasUsed),
          swappedAddressRejected: swapFailed,
          proveMs: Math.round(proved.elapsedMs),
        },
        null,
        2,
      ),
    );

    if (!swapFailed) throw new Error("Tampered claimant must fail on-chain.");
  } finally {
    anvil.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
