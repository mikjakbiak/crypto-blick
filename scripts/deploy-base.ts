import { writeFile } from "node:fs/promises";
import path from "node:path";
import { encodeAbiParameters, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { MONEY_CHAIN } from "../lib/chain/config";
import { appPublicClient, appWalletClient } from "../lib/chain/clients";
import { baseRpcUrl } from "../lib/chain/server-rpc";
import {
  ROOT,
  env,
  loadArtifact,
  upsertEnv,
  dropEnv,
  verifyContract,
  wait,
  writeEnv,
} from "./deploy-lib";

async function main() {
  const rpcUrl = baseRpcUrl();
  const account = privateKeyToAccount(env("DEPLOYER_PRIVATE_KEY") as Hex);
  const publicClient = appPublicClient(rpcUrl, MONEY_CHAIN);
  const wallet = appWalletClient(rpcUrl, account, MONEY_CHAIN);

  const balance = await publicClient.getBalance({ address: account.address });
  if (balance === 0n) {
    console.log(
      JSON.stringify({
        funded: false,
        address: account.address,
        message: "Send Base ETH to this address, then rerun bun run deploy:base",
      }),
    );
    process.exit(2);
  }

  const verifierArt = await loadArtifact("GiftyVerifier");
  const claimerArt = await loadArtifact("GiftyClaimer");

  const verifierHash = await wallet.deployContract({
    abi: verifierArt.abi,
    bytecode: verifierArt.bytecode.object,
  });
  const verifierReceipt = await wait(publicClient, verifierHash);
  const verifier = verifierReceipt.contractAddress;
  if (!verifier) throw new Error("GiftyVerifier deploy failed");

  const claimerHash = await wallet.deployContract({
    abi: claimerArt.abi,
    bytecode: claimerArt.bytecode.object,
    args: [verifier],
  });
  const claimerReceipt = await wait(publicClient, claimerHash);
  const giftyClaimer = claimerReceipt.contractAddress;
  if (!giftyClaimer) throw new Error("GiftyClaimer deploy failed");

  const addresses = {
    chain: "base",
    deployer: account.address,
    verifier,
    giftyClaimer,
  };

  await writeFile(
    path.join(ROOT, "deployments", "base.json"),
    `${JSON.stringify(addresses, null, 2)}\n`,
  );

  await writeEnv((contents) => {
    const next = dropEnv(contents, "NEXT_PUBLIC_GIFT_CLAIMER");
    return upsertEnv(next, "NEXT_PUBLIC_GIFTY_CLAIMER", giftyClaimer);
  });

  await verifyContract({
    chain: "base",
    address: verifier,
    contract: "src/GiftyVerifier.sol:GiftyVerifier",
  });
  await verifyContract({
    chain: "base",
    address: giftyClaimer,
    contract: "src/GiftyClaimer.sol:GiftyClaimer",
    constructorArgs: encodeAbiParameters([{ type: "address" }], [verifier]),
  });

  console.log(JSON.stringify(addresses, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
