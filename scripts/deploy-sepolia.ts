import { writeFile } from "node:fs/promises";
import path from "node:path";
import {
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  namehash,
  toHex,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  erc20Abi,
  ethRegistrarAbi,
  permissionedResolverInitAbi,
  userRegistryInitAbi,
  verifiableFactoryAbi,
} from "../lib/chain/abi";
import { alchemySepoliaUrl, ENS_CHAIN, SEPOLIA_ENS_V2 } from "../lib/chain/config";
import { appPublicClient, appWalletClient } from "../lib/chain/clients";
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

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;
const ALL_ROLES =
  0x1111111111111111111111111111111111111111111111111111111111111111n;
const ROLE_REGISTRAR = 1n;
const ROLE_RENEW = 1n << 16n;
const PARENT_LABEL = "gifty";

async function registerEthParent(
  publicClient: ReturnType<typeof appPublicClient>,
  wallet: ReturnType<typeof appWalletClient>,
  owner: Address,
  userRegistry: Address,
  resolver: Address,
) {
  const minDuration = await publicClient.readContract({
    address: SEPOLIA_ENS_V2.ethRegistrar,
    abi: ethRegistrarAbi,
    functionName: "MIN_REGISTER_DURATION",
  });
  const duration = minDuration > 365n * 24n * 60n * 60n ? minDuration : 365n * 24n * 60n * 60n;
  const secret = keccak256(toHex(`gifty-${Date.now()}`));
  const commitment = await publicClient.readContract({
    address: SEPOLIA_ENS_V2.ethRegistrar,
    abi: ethRegistrarAbi,
    functionName: "makeCommitment",
    args: [PARENT_LABEL, owner, secret, userRegistry, resolver, duration, ZERO_BYTES32],
  });
  await wait(
    publicClient,
    await wallet.writeContract({
      address: SEPOLIA_ENS_V2.ethRegistrar,
      abi: ethRegistrarAbi,
      functionName: "commit",
      args: [commitment],
    }),
  );
  const minAge = await publicClient.readContract({
    address: SEPOLIA_ENS_V2.ethRegistrar,
    abi: ethRegistrarAbi,
    functionName: "MIN_COMMITMENT_AGE",
  });
  await new Promise((resolve) => setTimeout(resolve, Number(minAge + 5n) * 1000));

  await wait(
    publicClient,
    await wallet.writeContract({
      address: SEPOLIA_ENS_V2.mockUsdc,
      abi: erc20Abi,
      functionName: "mint",
      args: [owner, 1_000_000_000_000n],
    }),
  );
  const price = await publicClient.readContract({
    address: SEPOLIA_ENS_V2.ethRegistrar,
    abi: ethRegistrarAbi,
    functionName: "getRegisterPrice",
    args: [PARENT_LABEL, duration, SEPOLIA_ENS_V2.mockUsdc],
  });
  await wait(
    publicClient,
    await wallet.writeContract({
      address: SEPOLIA_ENS_V2.mockUsdc,
      abi: erc20Abi,
      functionName: "approve",
      args: [SEPOLIA_ENS_V2.ethRegistrar, price[0] + price[1]],
    }),
  );
  await wait(
    publicClient,
    await wallet.writeContract({
      address: SEPOLIA_ENS_V2.ethRegistrar,
      abi: ethRegistrarAbi,
      functionName: "register",
      args: [
        PARENT_LABEL,
        owner,
        secret,
        userRegistry,
        resolver,
        duration,
        SEPOLIA_ENS_V2.mockUsdc,
        ZERO_BYTES32,
      ],
    }),
  );
}

async function deployFactoryProxy(
  publicClient: ReturnType<typeof appPublicClient>,
  wallet: ReturnType<typeof appWalletClient>,
  implementation: Address,
  saltLabel: string,
  data: Hex,
) {
  const hash = await wallet.writeContract({
    address: SEPOLIA_ENS_V2.verifiableFactory,
    abi: verifiableFactoryAbi,
    functionName: "deployProxy",
    args: [implementation, BigInt(keccak256(toHex(saltLabel))), data],
  });
  const receipt = await wait(publicClient, hash);
  const decoded = await publicClient.getContractEvents({
    address: SEPOLIA_ENS_V2.verifiableFactory,
    abi: verifiableFactoryAbi,
    eventName: "ProxyDeployed",
    fromBlock: receipt.blockNumber,
    toBlock: receipt.blockNumber,
  });
  const proxy = decoded[0]?.args.proxy;
  if (!proxy) throw new Error(`Factory proxy missing for ${saltLabel}`);
  return proxy;
}

async function main() {
  const rpcUrl = alchemySepoliaUrl(env("ALCHEMY_API_KEY"));
  const account = privateKeyToAccount(env("DEPLOYER_PRIVATE_KEY") as Hex);
  const publicClient = appPublicClient(rpcUrl, ENS_CHAIN);
  const wallet = appWalletClient(rpcUrl, account, ENS_CHAIN);

  const balance = await publicClient.getBalance({ address: account.address });
  if (balance === 0n) {
    console.log(
      JSON.stringify({
        funded: false,
        address: account.address,
        message: "Send Sepolia ETH to this address, then rerun bun run deploy:ens-sepolia",
      }),
    );
    process.exit(2);
  }

  const available = await publicClient.readContract({
    address: SEPOLIA_ENS_V2.ethRegistrar,
    abi: ethRegistrarAbi,
    functionName: "isAvailable",
    args: [PARENT_LABEL],
  });
  if (!available) {
    throw new Error("gifty.eth already taken on Sepolia ENSv2. Stopping.");
  }

  const registrarArt = await loadArtifact("GiftyRegistrar");
  const parentName = `${PARENT_LABEL}.eth`;
  const parentNode = namehash(parentName);

  const userInit = encodeFunctionData({
    abi: userRegistryInitAbi,
    functionName: "initialize",
    args: [account.address, ALL_ROLES],
  });
  const userRegistry = await deployFactoryProxy(
    publicClient,
    wallet,
    SEPOLIA_ENS_V2.userRegistryImpl,
    `gifty-user-registry-${Date.now()}`,
    userInit,
  );

  const resolverInit = encodeFunctionData({
    abi: permissionedResolverInitAbi,
    functionName: "initialize",
    args: [account.address, ALL_ROLES, []],
  });
  const resolver = await deployFactoryProxy(
    publicClient,
    wallet,
    SEPOLIA_ENS_V2.permissionedResolverImpl,
    `gifty-resolver-${Date.now()}`,
    resolverInit,
  );

  const usernameHash = await wallet.deployContract({
    abi: registrarArt.abi,
    bytecode: registrarArt.bytecode.object,
    args: [userRegistry, resolver, parentNode],
  });
  const usernameReceipt = await wait(publicClient, usernameHash);
  const usernameRegistrar = usernameReceipt.contractAddress;
  if (!usernameRegistrar) throw new Error("GiftyRegistrar deploy failed");

  await wait(
    publicClient,
    await wallet.writeContract({
      address: userRegistry,
      abi: userRegistryInitAbi,
      functionName: "grantRootRoles",
      args: [ROLE_REGISTRAR | ROLE_RENEW, usernameRegistrar],
    }),
  );
  await wait(
    publicClient,
    await wallet.writeContract({
      address: resolver,
      abi: permissionedResolverInitAbi,
      functionName: "grantRootRoles",
      args: [ALL_ROLES, usernameRegistrar],
    }),
  );

  await registerEthParent(publicClient, wallet, account.address, userRegistry, resolver);

  await wait(
    publicClient,
    await wallet.writeContract({
      address: resolver,
      abi: permissionedResolverInitAbi,
      functionName: "setAddr",
      args: [parentNode, account.address],
    }),
  );

  const addresses = {
    chain: "sepolia",
    deployer: account.address,
    userRegistry,
    resolver,
    usernameRegistrar,
    ensParent: parentName,
    ensParentRegistered: true,
  };

  await writeFile(
    path.join(ROOT, "deployments", "sepolia.json"),
    `${JSON.stringify(addresses, null, 2)}\n`,
  );

  await writeEnv((contents) => {
    let next = dropEnv(contents, "NEXT_PUBLIC_GIFT_CLAIMER");
    next = dropEnv(next, "NEXT_PUBLIC_PREVIOUS_USERNAME_REGISTRARS");
    next = upsertEnv(next, "NEXT_PUBLIC_USERNAME_REGISTRAR", usernameRegistrar);
    return upsertEnv(next, "NEXT_PUBLIC_ENS_PARENT", parentName);
  });

  await verifyContract({
    chain: "sepolia",
    address: usernameRegistrar,
    contract: "src/GiftyRegistrar.sol:GiftyRegistrar",
    constructorArgs: encodeAbiParameters(
      [
        { type: "address" },
        { type: "address" },
        { type: "bytes32" },
      ],
      [userRegistry, resolver, parentNode],
    ),
  });

  console.log(JSON.stringify(addresses, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
