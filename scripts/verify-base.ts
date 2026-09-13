import { readFile } from "node:fs/promises";
import path from "node:path";
import { encodeAbiParameters, type Address } from "viem";
import { ROOT, verifyContract } from "./deploy-lib";

async function main() {
  const deployed = JSON.parse(
    await readFile(path.join(ROOT, "deployments", "base.json"), "utf8"),
  ) as {
    verifier: Address;
    giftyClaimer: Address;
  };

  await verifyContract({
    chain: "base",
    address: deployed.verifier,
    contract: "src/GiftyVerifier.sol:GiftyVerifier",
  });
  await verifyContract({
    chain: "base",
    address: deployed.giftyClaimer,
    contract: "src/GiftyClaimer.sol:GiftyClaimer",
    constructorArgs: encodeAbiParameters(
      [{ type: "address" }],
      [deployed.verifier],
    ),
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
