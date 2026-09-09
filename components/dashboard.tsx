"use client";

import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useAddFunds, usePrivy, useWallets } from "@privy-io/react-auth";
import { formatUnits, isAddress } from "viem";
import AccountMenu from "@/components/account-menu";
import SendGiftForm from "@/components/send-gift-form";
import {
  addContact,
  getContacts,
  getContactsSnapshot,
  getServerContactsSnapshot,
  removeContact,
  subscribeToContacts,
} from "@/lib/contacts";
import { getBalancesByAddress, getEnsByAddress } from "@/lib/mock-chain";
import { DASHBOARD_TOKENS, formatTokenAmount, formatUsd } from "@/lib/tokens";

const ETHEREUM_USDC_ADDRESS = "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";

type Tab = "assets" | "contacts" | "send";

type TokenRow = {
  symbol: string;
  name: string;
  balance: number;
  valueUsd: number;
};

function isValidContactDestination(value: string) {
  return isAddress(value) || /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(value);
}

export default function Dashboard() {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { addFunds } = useAddFunds();
  const wallet =
    wallets.find(
      (candidate) =>
        candidate.walletClientType === "privy" ||
        candidate.walletClientType === "privy-v2",
    ) ?? wallets[0];

  const [tab, setTab] = useState<Tab>("assets");
  const [funding, setFunding] = useState(false);
  const [fundingError, setFundingError] = useState<string | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [contactError, setContactError] = useState<string | null>(null);
  const contactsSnapshot = useSyncExternalStore(
    subscribeToContacts,
    getContactsSnapshot,
    getServerContactsSnapshot,
  );

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      router.replace("/");
    }
  }, [ready, authenticated, router]);

  const walletAddress = wallet?.address;
  const contacts = walletAddress
    ? getContacts(walletAddress, contactsSnapshot)
    : [];
  const ensName = walletAddress ? getEnsByAddress(walletAddress) : null;
  const balances = walletAddress ? getBalancesByAddress(walletAddress) : null;
  const tokens = useMemo<TokenRow[]>(
    () =>
      DASHBOARD_TOKENS.map((token) => {
        const rawBalance =
          balances?.[token.symbol as keyof typeof balances] ?? "0";
        const balance = Number(formatUnits(BigInt(rawBalance), token.decimals));
        return {
          symbol: token.symbol,
          name: token.name,
          balance,
          valueUsd: balance * token.priceUsd,
        };
      }),
    [balances],
  );
  const loadingBalances = !walletsReady || !wallet?.address;

  const totalUsd = tokens.reduce((sum, token) => sum + token.valueUsd, 0);
  const displayName =
    ensName ??
    (wallet?.address
      ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`
      : "Account");

  async function handleOnRamp() {
    if (!wallet?.address || funding) return;
    setFunding(true);
    setFundingError(null);
    try {
      await addFunds({
        destination: {
          address: wallet.address,
          chain: "eip155:1",
          asset: ETHEREUM_USDC_ADDRESS,
        },
        fiat: {
          source: {
            assets: ["usd", "eur"],
            defaultAsset: "usd",
          },
          environment: "production",
          defaultAmount: "50",
        },
      });
    } catch {
      setFundingError("The funding flow was cancelled or could not be opened.");
    } finally {
      setFunding(false);
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

  if (!ready || !authenticated) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-8 text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-4 dark:border-zinc-800">
        <div>
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
            Dashboard
          </p>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {tab === "assets"
              ? "Portfolio"
              : tab === "contacts"
                ? "Contacts"
                : "Send Gift"}
          </h1>
        </div>
        <AccountMenu
          name={displayName}
          ethBalance={
            tokens.find((token) => token.symbol === "ETH")?.balance ?? 0
          }
        />
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
        <div
          className="grid grid-cols-3 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900"
          role="tablist"
          aria-label="Dashboard sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "assets"}
            onClick={() => setTab("assets")}
            className={`min-h-11 rounded-lg px-3 text-sm font-medium transition-colors ${
              tab === "assets"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            Assets
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "send"}
            onClick={() => setTab("send")}
            className={`min-h-11 rounded-lg px-3 text-sm font-medium transition-colors ${
              tab === "send"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            Send
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "contacts"}
            onClick={() => setTab("contacts")}
            className={`min-h-11 rounded-lg px-3 text-sm font-medium transition-colors ${
              tab === "contacts"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            Contacts
          </button>
        </div>

        {tab === "assets" ? (
          <>
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Total balance
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                {loadingBalances ? "…" : formatUsd(totalUsd)}
              </p>
              <button
                type="button"
                onClick={handleOnRamp}
                disabled={!walletsReady || !wallet || funding}
                className="mt-5 min-h-12 w-full rounded-xl bg-zinc-900 px-4 text-base font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                {funding ? "Opening on-ramp…" : "Add funds"}
              </button>
              {fundingError ? (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                  {fundingError}
                </p>
              ) : null}
            </section>

            <section>
              <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Tokens
              </h2>
              <ul className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                {tokens.map((token, index) => (
                  <li
                    key={token.symbol}
                    className={`flex items-center justify-between gap-3 px-4 py-4 ${
                      index > 0
                        ? "border-t border-zinc-100 dark:border-zinc-900"
                        : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">
                        {token.symbol}
                      </p>
                      <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                        {token.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm text-zinc-900 dark:text-zinc-50">
                        {loadingBalances
                          ? "…"
                          : formatTokenAmount(token.balance)}
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {loadingBalances ? "…" : formatUsd(token.valueUsd)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : tab === "send" ? (
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <SendGiftForm />
          </section>
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
                  className="min-h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                />
                <input
                  type="text"
                  value={contactAddress}
                  onChange={(event) => setContactAddress(event.target.value)}
                  placeholder="Address or ENS"
                  spellCheck={false}
                  className="min-h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 font-mono text-sm text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                />
                {contactError ? (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {contactError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  className="min-h-12 w-full rounded-xl bg-zinc-900 px-4 text-base font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
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
                      <button
                        type="button"
                        onClick={() => handleRemoveContact(contact.id)}
                        className="shrink-0 rounded-lg px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                      >
                        Remove
                      </button>
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
