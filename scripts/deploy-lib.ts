import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { Abi, Hex } from "viem";
import { appPublicClient } from "../lib/chain/clients";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export async function loadArtifact(name: string) {
  const filePath = path.join(ROOT, "contracts", "out", `${name}.sol`, `${name}.json`);
  return JSON.parse(await readFile(filePath, "utf8")) as {
    abi: Abi;
    bytecode: { object: Hex };
  };
}

export async function wait(
  publicClient: ReturnType<typeof appPublicClient>,
  hash: Hex,
) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`Tx reverted: ${hash}`);
  }
  return receipt;
}

export function upsertEnv(contents: string, key: string, value: string) {
  const line = `${key}=${value}`;
  if (contents.includes(`${key}=`)) {
    return contents.replace(new RegExp(`${key}=.*`), line);
  }
  return `${contents.trimEnd()}\n${line}\n`;
}

export function dropEnv(contents: string, key: string) {
  return contents
    .split("\n")
    .filter((line) => !line.startsWith(`${key}=`))
    .join("\n");
}

export async function writeEnv(mutator: (contents: string) => string) {
  const envPath = path.join(ROOT, ".env");
  const contents = await readFile(envPath, "utf8");
  await writeFile(envPath, mutator(contents));
}

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd: ROOT, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited ${code}`));
    });
  });
}

export async function verifyContract(args: {
  chain: "sepolia" | "base";
  address: string;
  contract: string;
  constructorArgs?: Hex;
}) {
  const key = env("ETHERSCAN_API_KEY");
  const cli = [
    "verify-contract",
    "--root",
    "contracts",
    "--chain",
    args.chain,
    args.address,
    args.contract,
    "--etherscan-api-key",
    key,
    "--watch",
  ];
  if (args.constructorArgs) {
    cli.push("--constructor-args", args.constructorArgs);
  }
  await run("forge", cli);
}
