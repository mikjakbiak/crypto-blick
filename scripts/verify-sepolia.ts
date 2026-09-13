import { readFile } from "node:fs/promises";
import path from "node:path";
import { encodeAbiParameters, namehash, type Address } from "viem";
import { ROOT, verifyContract } from "./deploy-lib";

async function main() {
  const deployed = JSON.parse(
    await readFile(path.join(ROOT, "deployments", "sepolia.json"), "utf8"),
  ) as {
    usernameRegistrar: Address;
    userRegistry: Address;
    resolver: Address;
    ensParent: string;
  };

  await verifyContract({
    chain: "sepolia",
    address: deployed.usernameRegistrar,
    contract: "src/GiftyRegistrar.sol:GiftyRegistrar",
    constructorArgs: encodeAbiParameters(
      [{ type: "address" }, { type: "address" }, { type: "bytes32" }],
      [deployed.userRegistry, deployed.resolver, namehash(deployed.ensParent)],
    ),
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
