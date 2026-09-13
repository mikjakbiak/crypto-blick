import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  encodeFunctionData,
  keccak256,
  namehash,
  parseAbi,
  toHex,
  type Abi,
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
import { alchemySepoliaUrl, SEPOLIA_ENS_V2 } from "../lib/chain/config";
import { appPublicClient, appWalletClient } from "../lib/chain/clients";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ZERO = "0x0000000000000000000000000000000000000000" as Address;
const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;
const ALL_ROLES =
  0x1111111111111111111111111111111111111111111111111111111111111111n;
const ROLE_REGISTRAR = 1n;
const ROLE_RENEW = 1n << 16n;
const PARENT_CANDIDATES = ["gift", "blick", "cryptoblick", "blickgift", "cbgift"];

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function loadArtifact(name: string) {
  const filePath = path.join(ROOT, "contracts", "out", `${name}.sol`, `${name}.json`);
  return JSON.parse(await readFile(filePath, "utf8")) as {
    abi: Abi;
    bytecode: { object: Hex };
  };
}

async function wait(
  publicClient: ReturnType<typeof appPublicClient>,
  hash: Hex,
) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`Tx reverted: ${hash}`);
  }
  return receipt;
}

function upsertEnv(contents: string, key: string, value: string) {
  const line = `${key}=${value}`;
  if (contents.includes(`${key}=`)) {
    return contents.replace(new RegExp(`${key}=.*`), line);
  }
  return `${contents.trimEnd()}\n${line}\n`;
}

async function registerEthParent(
  publicClient: ReturnType<typeof appPublicClient>,
  wallet: ReturnType<typeof appWalletClient>,
  owner: Address,
  parentLabel: string,
  userRegistry: Address,
  resolver: Address,
) {
  const minDuration = await publicClient.readContract({
    address: SEPOLIA_ENS_V2.ethRegistrar,
    abi: ethRegistrarAbi,
    functionName: "MIN_REGISTER_DURATION",
  });
  const duration = minDuration > 365n * 24n * 60n * 60n ? minDuration : 365n * 24n * 60n * 60n;
  const secret = keccak256(toHex(`blick-${Date.now()}`));
  const commitment = await publicClient.readContract({
    address: SEPOLIA_ENS_V2.ethRegistrar,
    abi: ethRegistrarAbi,
    functionName: "makeCommitment",
    args: [parentLabel, owner, secret, userRegistry, resolver, duration, ZERO_BYTES32],
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
    args: [parentLabel, duration, SEPOLIA_ENS_V2.mockUsdc],
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
        parentLabel,
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

async function main() {
  const rpcUrl = alchemySepoliaUrl(env("ALCHEMY_API_KEY"));
  const account = privateKeyToAccount(env("DEPLOYER_PRIVATE_KEY") as Hex);
  const publicClient = appPublicClient(rpcUrl);
  const wallet = appWalletClient(rpcUrl, account);

  const balance = await publicClient.getBalance({ address: account.address });
  if (balance === 0n) {
    console.log(
      JSON.stringify({
        funded: false,
        address: account.address,
        message: "Send Sepolia ETH to this address, then rerun bun run deploy:sepolia",
      }),
    );
    process.exit(2);
  }

  const previousPath = path.join(ROOT, "deployments", "sepolia.json");

  if (process.argv.includes("--parent-only")) {
    const previous = JSON.parse(
      await readFile(path.join(ROOT, "deployments", "sepolia.json"), "utf8"),
    ) as {
      giftClaimer: Address;
      usernameRegistrar: Address;
      userRegistry: Address;
      resolver: Address;
      verifier?: Address;
    };
    const parentLabel = (process.env.NEXT_PUBLIC_ENS_PARENT ?? "gift.eth")
      .replace(/\.eth$/i, "")
      .toLowerCase();
    const available = await publicClient.readContract({
      address: SEPOLIA_ENS_V2.ethRegistrar,
      abi: ethRegistrarAbi,
      functionName: "isAvailable",
      args: [parentLabel],
    });
    if (!available) {
      throw new Error(`${parentLabel}.eth already taken`);
    }
    const parentName = `${parentLabel}.eth`;
    const parentNode = namehash(parentName);
    await registerEthParent(
      publicClient,
      wallet,
      account.address,
      parentLabel,
      previous.userRegistry,
      previous.resolver,
    );
    await wait(
      publicClient,
      await wallet.writeContract({
        address: previous.resolver,
        abi: permissionedResolverInitAbi,
        functionName: "setAddr",
        args: [parentNode, account.address],
      }),
    );
    const { note: _dropNote, ...rest } = previous as typeof previous & {
      note?: string;
    };
    void _dropNote;
    const addresses = {
      ...rest,
      chain: "sepolia",
      deployer: account.address,
      ensParent: parentName,
      ensParentRegistered: true,
    };
    await writeFile(previousPath, `${JSON.stringify(addresses, null, 2)}\n`);
    const envPath = path.join(ROOT, ".env");
    let contents = await readFile(envPath, "utf8");
    contents = upsertEnv(contents, "NEXT_PUBLIC_ENS_PARENT", parentName);
    await writeFile(envPath, contents);
    console.log(JSON.stringify(addresses, null, 2));
    return;
  }

  const verifierArt = await loadArtifact("PlonkVerifier");
  const claimerArt = await loadArtifact("GiftClaimer");
  const registrarArt = await loadArtifact("FreeUsernameRegistrar");

  if (!process.argv.includes("--full")) {
    const previous = JSON.parse(await readFile(previousPath, "utf8")) as {
      verifier?: Address;
      giftClaimer?: Address;
      usernameRegistrar?: Address;
      previousUsernameRegistrars?: Address[];
      userRegistry: Address;
      resolver: Address;
      ensParent: string;
      deployer?: Address;
    };
    if (previous.userRegistry && previous.resolver && previous.ensParent) {
      const parentNode = namehash(previous.ensParent);

      const usernameHash = await wallet.deployContract({
        abi: registrarArt.abi,
        bytecode: registrarArt.bytecode.object,
        args: [previous.userRegistry, previous.resolver, parentNode],
      });
      const usernameReceipt = await wait(publicClient, usernameHash);
      const usernameRegistrar = usernameReceipt.contractAddress;
      if (!usernameRegistrar) throw new Error("Username registrar deploy failed");

      await wait(
        publicClient,
        await wallet.writeContract({
          address: previous.userRegistry,
          abi: userRegistryInitAbi,
          functionName: "grantRootRoles",
          args: [ROLE_REGISTRAR | ROLE_RENEW, usernameRegistrar],
        }),
      );
      await wait(
        publicClient,
        await wallet.writeContract({
          address: previous.resolver,
          abi: permissionedResolverInitAbi,
          functionName: "grantRootRoles",
          args: [ALL_ROLES, usernameRegistrar],
        }),
      );

      const previousRegistrars = [
        ...(previous.previousUsernameRegistrars ?? []),
        ...(previous.usernameRegistrar ? [previous.usernameRegistrar] : []),
      ].filter(
        (value, index, all) =>
          all.findIndex((item) => item.toLowerCase() === value.toLowerCase()) ===
          index,
      );

      const addresses = {
        chain: "sepolia",
        deployer: account.address,
        verifier: previous.verifier,
        giftClaimer: previous.giftClaimer,
        userRegistry: previous.userRegistry,
        resolver: previous.resolver,
        usernameRegistrar,
        previousUsernameRegistrars: previousRegistrars,
        ensParent: previous.ensParent,
        ensParentRegistered: true,
      };
      await writeFile(previousPath, `${JSON.stringify(addresses, null, 2)}\n`);
      const envPath = path.join(ROOT, ".env");
      let contents = await readFile(envPath, "utf8");
      if (previous.giftClaimer) {
        contents = upsertEnv(contents, "NEXT_PUBLIC_GIFT_CLAIMER", previous.giftClaimer);
      }
      contents = upsertEnv(contents, "NEXT_PUBLIC_USERNAME_REGISTRAR", usernameRegistrar);
      contents = upsertEnv(
        contents,
        "NEXT_PUBLIC_PREVIOUS_USERNAME_REGISTRARS",
        previousRegistrars.join(","),
      );
      contents = upsertEnv(contents, "NEXT_PUBLIC_ENS_PARENT", previous.ensParent);
      await writeFile(envPath, contents);
      console.log(JSON.stringify(addresses, null, 2));
      return;
    }
  }

  const verifierHash = await wallet.deployContract({
    abi: verifierArt.abi,
    bytecode: verifierArt.bytecode.object,
  });
  const verifierReceipt = await wait(publicClient, verifierHash);
  const verifier = verifierReceipt.contractAddress;
  if (!verifier) throw new Error("Verifier deploy failed");

  const claimerHash = await wallet.deployContract({
    abi: claimerArt.abi,
    bytecode: claimerArt.bytecode.object,
    args: [verifier],
  });
  const claimerReceipt = await wait(publicClient, claimerHash);
  const giftClaimer = claimerReceipt.contractAddress;
  if (!giftClaimer) throw new Error("GiftClaimer deploy failed");

  const userInit = encodeFunctionData({
    abi: userRegistryInitAbi,
    functionName: "initialize",
    args: [account.address, ALL_ROLES],
  });
  const userProxyHash = await wallet.writeContract({
    address: SEPOLIA_ENS_V2.verifiableFactory,
    abi: verifiableFactoryAbi,
    functionName: "deployProxy",
    args: [
      SEPOLIA_ENS_V2.userRegistryImpl,
      BigInt(keccak256(toHex(`blick-user-registry-${Date.now()}`))),
      userInit,
    ],
  });
  const userProxyReceipt = await wait(publicClient, userProxyHash);
  const userRegistryLog = userProxyReceipt.logs.find(
    (log) => log.address.toLowerCase() === SEPOLIA_ENS_V2.verifiableFactory.toLowerCase(),
  );
  let userRegistry = userRegistryLog
    ? (`0x${userRegistryLog.topics[2]?.slice(26)}` as Address)
    : undefined;
  if (!userRegistry) {
    const decoded = await publicClient.getContractEvents({
      address: SEPOLIA_ENS_V2.verifiableFactory,
      abi: verifiableFactoryAbi,
      eventName: "ProxyDeployed",
      fromBlock: userProxyReceipt.blockNumber,
      toBlock: userProxyReceipt.blockNumber,
    });
    userRegistry = decoded[0]?.args.proxy;
  }
  if (!userRegistry) throw new Error("UserRegistry proxy missing");

  const resolverInit = encodeFunctionData({
    abi: permissionedResolverInitAbi,
    functionName: "initialize",
    args: [account.address, ALL_ROLES, []],
  });
  const resolverHash = await wallet.writeContract({
    address: SEPOLIA_ENS_V2.verifiableFactory,
    abi: verifiableFactoryAbi,
    functionName: "deployProxy",
    args: [
      SEPOLIA_ENS_V2.permissionedResolverImpl,
      BigInt(keccak256(toHex(`blick-resolver-${Date.now()}`))),
      resolverInit,
    ],
  });
  const resolverReceipt = await wait(publicClient, resolverHash);
  const resolverEvents = await publicClient.getContractEvents({
    address: SEPOLIA_ENS_V2.verifiableFactory,
    abi: verifiableFactoryAbi,
    eventName: "ProxyDeployed",
    fromBlock: resolverReceipt.blockNumber,
    toBlock: resolverReceipt.blockNumber,
  });
  const resolver = resolverEvents[0]?.args.proxy;
  if (!resolver) throw new Error("Resolver proxy missing");

  let parentLabel: string | null = null;
  for (const label of PARENT_CANDIDATES) {
    const available = await publicClient.readContract({
      address: SEPOLIA_ENS_V2.ethRegistrar,
      abi: ethRegistrarAbi,
      functionName: "isAvailable",
      args: [label],
    });
    if (available) {
      parentLabel = label;
      break;
    }
  }
  if (!parentLabel) throw new Error("No available parent 2LD on Sepolia ETH registrar");

  const parentName = `${parentLabel}.eth`;
  const parentNode = namehash(parentName);

  const usernameHash = await wallet.deployContract({
    abi: registrarArt.abi,
    bytecode: registrarArt.bytecode.object,
    args: [userRegistry, resolver, parentNode],
  });
  const usernameReceipt = await wait(publicClient, usernameHash);
  const usernameRegistrar = usernameReceipt.contractAddress;
  if (!usernameRegistrar) throw new Error("Username registrar deploy failed");

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

  await registerEthParent(
    publicClient,
    wallet,
    account.address,
    parentLabel,
    userRegistry,
    resolver,
  );

  await wait(
    publicClient,
    await wallet.writeContract({
      address: resolver,
      abi: permissionedResolverInitAbi,
      functionName: "setAddr",
      args: [parentNode, account.address],
    }),
  );

  void parseAbi;
  void ZERO;

  const addresses = {
    chain: "sepolia",
    deployer: account.address,
    verifier,
    giftClaimer,
    userRegistry,
    resolver,
    usernameRegistrar,
    ensParent: parentName,
  };

  await writeFile(
    path.join(ROOT, "deployments", "sepolia.json"),
    `${JSON.stringify(addresses, null, 2)}\n`,
  );

  const envPath = path.join(ROOT, ".env");
  let contents = await readFile(envPath, "utf8");
  contents = upsertEnv(contents, "NEXT_PUBLIC_GIFT_CLAIMER", giftClaimer);
  contents = upsertEnv(contents, "NEXT_PUBLIC_USERNAME_REGISTRAR", usernameRegistrar);
  contents = upsertEnv(contents, "NEXT_PUBLIC_ENS_PARENT", parentName);
  await writeFile(envPath, contents);

  console.log(JSON.stringify(addresses, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
