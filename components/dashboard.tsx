"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAddFunds, usePrivy, useWallets } from "@privy-io/react-auth";
import { formatUnits, isAddress } from "viem";
import AccountMenu from "@/components/account-menu";
import SendGiftForm, { type SendMode } from "@/components/send-gift-form";
import SentGiftsList from "@/components/sent-gifts-list";
import {
  addContact,
  getContacts,
  getContactsSnapshot,
  getServerContactsSnapshot,
  removeContact,
  subscribeToContacts,
} from "@/lib/contacts";
import UsernameForm from "@/components/username-form";
import GiftReceived from "@/components/gift-received";
import DemoSpendCard from "@/components/demo-spend-card";
import SwapPanel from "@/components/swap-panel";
import useResumeGiftClaim from "@/components/use-resume-gift-claim";
import { homePath } from "@/lib/paths";
import { BASE_NATIVE, BASE_USDC } from "@/lib/chain/config";
import { resolveClaimCode } from "@/lib/claim-code";
import {
  formatTokenAmount,
  formatUsd,
  formatUsdOrUnavailable,
  type PortfolioToken,
} from "@/lib/tokens";

type Tab = "assets" | "send" | "contacts";

type TokenRow = {
  id: string;
  symbol: string;
  name: string;
  balance: number;
  valueUsd: number | null;
  logo: string | null;
};

function isValidContactDestination(value: string) {
  return (
    isAddress(value) ||
    /^[a-z0-9-]+$/i.test(value) ||
    /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(value)
  );
}

function parseTab(value: string | null): Tab {
  if (value === "assets" || value === "send" || value === "contacts") {
    return value;
  }
  return "assets";
}

function parseSendMode(value: string | null, hasRecipient: boolean): SendMode {
  if (value === "gift" || value === "transfer") return value;
  return hasRecipient ? "transfer" : "gift";
}

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, authenticated, user } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { addFunds } = useAddFunds();
  const wallet =
    wallets.find(
      (candidate) =>
        candidate.walletClientType === "privy" ||
        candidate.walletClientType === "privy-v2",
    ) ?? wallets[0];

  const recipient = searchParams.get("recipient")?.trim() ?? "";
  const tab = parseTab(searchParams.get("tab"));
  const sendMode = parseSendMode(searchParams.get("mode"), Boolean(recipient));

  const [balances, setBalances] = useState<{
    nativeRawBalance: string;
    tokens: PortfolioToken[];
  } | null>(null);
  const [ensName, setEnsName] = useState<string | null>(null);
  const [ensReady, setEnsReady] = useState(false);
  const [balancesVersion, setBalancesVersion] = useState(0);
  const [usernameVersion, setUsernameVersion] = useState(0);
  const [funding, setFunding] = useState(false);
  const [fundingError, setFundingError] = useState<string | null>(null);
  const [depositing, setDepositing] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [contactError, setContactError] = useState<string | null>(null);
  const contactsSnapshot = useSyncExternalStore(
    subscribeToContacts,
    getContactsSnapshot,
    getServerContactsSnapshot,
  );

  const signedIn = Boolean(ready && authenticated && user);

  const pendingCode = resolveClaimCode(searchParams.get("code"));
  const walletAddress = signedIn ? wallet?.address : undefined;

  useLayoutEffect(() => {
    if (!ready || signedIn) return;
    router.replace(homePath(pendingCode || null));
  }, [ready, signedIn, router, pendingCode]);

  useEffect(() => {
    if (!walletAddress) return;
    let cancelled = false;
    async function load() {
      const [balanceRes, ensRes] = await Promise.all([
        fetch(`/api/balances?address=${walletAddress}`, { cache: "no-store" }),
        fetch(`/api/ens?address=${walletAddress}`, { cache: "no-store" }),
      ]);
      const nextBalances = (await balanceRes.json()) as {
        nativeRawBalance?: string;
        tokens?: PortfolioToken[];
      };
      const nextEns = (await ensRes.json()) as { ens?: string | null };
      if (cancelled) return;
      setBalances({
        nativeRawBalance: nextBalances.nativeRawBalance ?? "0",
        tokens: balanceRes.ok ? (nextBalances.tokens ?? []) : [],
      });
      setEnsName(nextEns.ens ?? null);
      setEnsReady(true);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [walletAddress, balancesVersion, usernameVersion]);

  const contacts = walletAddress
    ? getContacts(walletAddress, contactsSnapshot)
    : [];
  const refreshBalances = useCallback(() => {
    setBalancesVersion((value) => value + 1);
  }, []);
  const claim = useResumeGiftClaim(
    signedIn ? walletAddress : undefined,
    signedIn && walletAddress ? ensName : null,
    refreshBalances,
  );

  useEffect(() => {
    if (claim.status !== "claimed") return;
    const retry = window.setTimeout(refreshBalances, 1500);
    return () => window.clearTimeout(retry);
  }, [claim.status, refreshBalances]);
  const tokens = useMemo<TokenRow[]>(() => {
    if (!walletAddress || !balances) return [];
    return balances.tokens.map((token) => {
      const decimals = Number.isFinite(token.decimals) ? token.decimals : 18;
      let balance = 0;
      try {
        balance = Number(formatUnits(BigInt(token.rawBalance), decimals));
      } catch {
        balance = 0;
      }
      return {
        id: token.id,
        symbol: token.symbol,
        name: token.name,
        balance,
        valueUsd:
          token.priceUsd == null ? null : balance * token.priceUsd,
        logo: token.logo ?? null,
      };
    });
  }, [balances, walletAddress]);
  const ethBalance = useMemo(() => {
    if (!balances) return 0;
    try {
      return Number(formatUnits(BigInt(balances.nativeRawBalance), 18));
    } catch {
      return 0;
    }
  }, [balances]);
  const loadingBalances = !walletsReady || !wallet?.address || !balances;
  const totalUsd = tokens.reduce(
    (sum, token) => (token.valueUsd == null ? sum : sum + token.valueUsd),
    0,
  );

  const displayName =
    ensName ??
    (wallet?.address
      ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`
      : "Account");

  function replaceDashboardQuery(next: {
    tab?: Tab;
    mode?: SendMode;
    recipient?: string | null;
  }) {
    const params = new URLSearchParams();
    const nextTab = next.tab ?? tab;
    const nextMode = next.mode ?? sendMode;
    const nextRecipient =
      next.recipient === undefined ? recipient : (next.recipient ?? "");

    if (nextTab !== "assets") params.set("tab", nextTab);
    if (nextTab === "send") {
      params.set("mode", nextMode);
      if (nextMode === "transfer" && nextRecipient) {
        params.set("recipient", nextRecipient);
      }
    }
    if (pendingCode && claim.status !== "claimed") {
      params.set("code", pendingCode);
    }

    const query = params.toString();
    router.replace(query ? `/dashboard?${query}` : "/dashboard");
  }

  function openSendToRecipient(addressOrEns: string) {
    replaceDashboardQuery({
      tab: "send",
      mode: "transfer",
      recipient: addressOrEns,
    });
  }

  function fundDestination(asset: typeof BASE_USDC | typeof BASE_NATIVE) {
    if (!wallet?.address) return null;
    return {
      address: wallet.address,
      chain: "eip155:8453" as const,
      asset,
    };
  }

  async function handleOnRamp() {
    const destination = fundDestination(BASE_USDC);
    if (!destination || funding || depositing) return;
    setFunding(true);
    setFundingError(null);
    try {
      await addFunds({
        destination,
        fiat: {
          source: {
            assets: ["usd", "eur"],
            defaultAsset: "usd",
          },
          environment: "production",
          defaultAmount: "50",
        },
      });
      refreshBalances();
    } catch {
      setFundingError("The funding flow was cancelled or could not be opened.");
    } finally {
      setFunding(false);
    }
  }

  async function handleDepositEth() {
    const destination = fundDestination(BASE_NATIVE);
    if (!destination || funding || depositing) return;
    setDepositing(true);
    setDepositError(null);
    try {
      await addFunds({
        destination,
        crypto: { slippageBps: 100 },
      });
      refreshBalances();
    } catch {
      setDepositError("The deposit flow was cancelled or could not be opened.");
    } finally {
      setDepositing(false);
    }
  }

  function handleAddContact(event: FormEvent) {
    event.preventDefault();
    setContactError(null);

    const name = contactName.trim();
    const addressOrEns = contactAddress.trim();

    if (!name || !addressOrEns) {
      setContactError("Name and address are required.");
      return;
    }

    if (!wallet?.address) {
      setContactError("Your wallet is still loading.");
      return;
    }

    if (!isValidContactDestination(addressOrEns)) {
      setContactError("Enter a valid Ethereum address or ENS name.");
      return;
    }

    if (
      contacts.some(
        (contact) =>
          contact.addressOrEns.toLowerCase() === addressOrEns.toLowerCase(),
      )
    ) {
      setContactError("This address is already in your contacts.");
      return;
    }

    addContact(wallet.address, { name, addressOrEns });
    setContactName("");
    setContactAddress("");
  }

  function handleRemoveContact(id: string) {
    if (!wallet?.address) return;
    removeContact(wallet.address, id);
  }

  if (!signedIn) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-8 text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  if (walletsReady && walletAddress && ensReady && !ensName) {
    return (
      <div className="landing relative flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-end px-4 py-4">
          <AccountMenu name={displayName} ethBalance={ethBalance} />
        </header>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-10">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-teal-800 dark:text-teal-300">
            Create your account
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-teal-950 dark:text-teal-50">
            Pick a free username
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            {pendingCode
              ? "Choose your username first. After that we claim the gift into this account."
              : "Every account gets a free username before the app opens."}
          </p>
          <div className="mt-6 rounded-3xl border border-teal-900/10 bg-white/90 p-5 shadow-[0_24px_60px_-28px_rgba(15,118,110,0.45)] sm:p-7 dark:border-teal-400/15 dark:bg-zinc-950/85">
            <UsernameForm
              address={walletAddress}
              onRegistered={() => {
                setUsernameVersion((value) => value + 1);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "assets", label: "Assets" },
    { id: "send", label: "Send" },
    { id: "contacts", label: "Contacts" },
  ];

  return (
    <div className="landing flex flex-1 flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-end px-4 py-4">
        <AccountMenu name={displayName} ethBalance={ethBalance} />
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
        {claim.status === "claiming" ? (
          <p className="rounded-2xl border border-teal-900/10 bg-teal-50 px-4 py-3 text-sm text-teal-900 dark:border-teal-400/20 dark:bg-teal-950/40 dark:text-teal-100">
            Claiming your gift to this wallet…
          </p>
        ) : null}
        {claim.status === "claimed" && claim.paidWei != null ? (
          <GiftReceived paidWei={claim.paidWei} celebrate={claim.celebrate} />
        ) : null}
        {claim.status === "error" && claim.error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {claim.error}
          </p>
        ) : null}
        <div
          className="grid grid-cols-3 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900"
          role="tablist"
          aria-label="Dashboard sections"
        >
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => replaceDashboardQuery({ tab: item.id })}
              className={`min-h-11 rounded-lg px-2 text-sm font-medium transition-colors ${
                tab === item.id
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "assets" ? (
          <>
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Wallet address
              </p>
              <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-50">
                {ensName ?? "…"}
              </p>
              <p className="mt-0.5 truncate font-mono text-sm text-zinc-500 dark:text-zinc-400">
                {walletAddress ?? "…"}
              </p>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Total balance
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                {loadingBalances ? "…" : formatUsd(totalUsd)}
              </p>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Card buys Base USDC. Send crypto from another wallet to get Base
                ETH.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleOnRamp}
                  disabled={!walletsReady || !wallet || funding || depositing}
                  className="min-h-12 rounded-xl bg-zinc-900 px-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  {funding ? "Opening…" : "Add USDC"}
                </button>
                <button
                  type="button"
                  onClick={handleDepositEth}
                  disabled={!walletsReady || !wallet || funding || depositing}
                  className="min-h-12 rounded-xl border border-zinc-200 px-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
                >
                  {depositing ? "Opening…" : "Deposit ETH"}
                </button>
              </div>
              {fundingError ? (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                  {fundingError}
                </p>
              ) : null}
              {depositError ? (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                  {depositError}
                </p>
              ) : null}
            </section>

            {walletAddress && balances ? (
              <SwapPanel
                address={walletAddress}
                ethRaw={balances.nativeRawBalance}
                usdcRaw={
                  balances.tokens.find(
                    (token) =>
                      token.contractAddress?.toLowerCase() ===
                      BASE_USDC.toLowerCase(),
                  )?.rawBalance ?? "0"
                }
                onSwapped={refreshBalances}
              />
            ) : null}

            {walletAddress ? <DemoSpendCard address={walletAddress} /> : null}

            <section>
              <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Tokens
              </h2>
              <ul className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                {tokens.length === 0 && !loadingBalances ? (
                  <li className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    No tokens with a balance.
                  </li>
                ) : loadingBalances ? (
                  <li className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    Loading tokens…
                  </li>
                ) : (
                  tokens.map((token, index) => (
                    <li
                      key={token.id}
                      className={`flex items-center justify-between gap-3 px-4 py-4 ${
                        index > 0
                          ? "border-t border-zinc-100 dark:border-zinc-900"
                          : ""
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {token.logo ? (
                          <img
                            src={token.logo}
                            alt=""
                            width={32}
                            height={32}
                            className="size-8 shrink-0 rounded-full object-cover"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : null}
                        <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                          {token.name}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-medium text-zinc-900 dark:text-zinc-50">
                          {formatUsdOrUnavailable(token.valueUsd)}
                        </p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {formatTokenAmount(token.balance)} {token.symbol}
                        </p>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </>
        ) : tab === "send" ? (
          <>
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <div
                className="grid grid-cols-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900"
                role="tablist"
                aria-label="Send mode"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={sendMode === "gift"}
                  onClick={() =>
                    replaceDashboardQuery({
                      tab: "send",
                      mode: "gift",
                      recipient: null,
                    })
                  }
                  className={`min-h-11 rounded-lg px-3 text-sm font-medium transition-colors ${
                    sendMode === "gift"
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                      : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  Send gift
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={sendMode === "transfer"}
                  onClick={() =>
                    replaceDashboardQuery({
                      tab: "send",
                      mode: "transfer",
                    })
                  }
                  className={`min-h-11 rounded-lg px-3 text-sm font-medium transition-colors ${
                    sendMode === "transfer"
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                      : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  Send ETH
                </button>
              </div>
              <div className="mt-5">
                <SendGiftForm
                  key={`${sendMode}:${recipient}`}
                  mode={sendMode}
                  initialRecipient={recipient}
                  onTransferred={() => setBalancesVersion((value) => value + 1)}
                />
              </div>
            </section>
            {walletAddress ? (
              <SentGiftsList walletAddress={walletAddress} />
            ) : null}
          </>
        ) : (
          <>
            <form
              className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
              onSubmit={handleAddContact}
            >
              <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Add contact
              </h2>
              <div className="mt-4 flex flex-col gap-3">
                <input
                  type="text"
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  placeholder="Name"
                  className="min-h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base text-zinc-900 outline-none ring-teal-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                />
                <input
                  type="text"
                  value={contactAddress}
                  onChange={(event) => setContactAddress(event.target.value)}
                  placeholder="Address or ENS"
                  spellCheck={false}
                  className="min-h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 font-mono text-sm text-zinc-900 outline-none ring-teal-500/40 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                />
                {contactError ? (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {contactError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  className="min-h-12 w-full rounded-xl bg-teal-800 px-4 text-base font-medium text-white transition-colors hover:bg-teal-700 dark:bg-teal-500 dark:text-zinc-950 dark:hover:bg-teal-400"
                >
                  Save contact
                </button>
              </div>
            </form>

            <section>
              <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Saved contacts
              </h2>
              {contacts.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  No contacts yet.
                </p>
              ) : (
                <ul className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                  {contacts.map((contact, index) => (
                    <li
                      key={contact.id}
                      className={`flex items-center justify-between gap-3 px-4 py-4 ${
                        index > 0
                          ? "border-t border-zinc-100 dark:border-zinc-900"
                          : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900 dark:text-zinc-50">
                          {contact.name}
                        </p>
                        <p className="truncate font-mono text-sm text-zinc-500 dark:text-zinc-400">
                          {contact.addressOrEns}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            openSendToRecipient(contact.addressOrEns)
                          }
                          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-900"
                        >
                          Send
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveContact(contact.id)}
                          className="rounded-lg px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
