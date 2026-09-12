# Mission

**Crypto-blick is a social crypto wallet that lets anyone send money the way they already send messages — by name, link, or phone number — while keeping gift claims trust-minimized and on-chain.**

The product should feel like modern fintech (clear, cute, fast) without hiding that value moves on Ethereum. Primary growth loop: **gift → claim → contact → repeat send**.

Hackathon target: [ETHOnline 2026](https://ethglobal.com/events/ethonline2026) — [ENS](https://ethglobal.com/events/ethonline2026/prizes/ens) and [Privy](https://ethglobal.com/events/ethonline2026/prizes/privy).

---

## Problem

Crypto wallets still assume the user already understands addresses, networks, and seed phrases.

- Sending money means copying hex or teaching someone what a wallet is.
- Onboarding a friend means installing an app, backing up a key, and buying crypto first.
- Gift and referral flows often map codes to amounts in an off-chain database.

Crypto-blick: a sender creates a gift link. The recipient opens it, signs in with Privy (email → embedded wallet), **chooses a free username** (our ENSv2 subname), proves they know the gift code, and receives funds. Username is an account step, not something the sender “sends.”

---

## Who this is for

| Audience | Need |
|---|---|
| **Senders** | Send crypto without lecturing friends about wallets |
| **New recipients** | First payment via link, plus a username from signup |
| **Returning users** | Balance, onramp, card spend, pay contacts by username / phone / ENS |

---

## Product principles

1. **Familiar UX first** — balances, contacts, and sends feel like a neobank app.
2. **Login before jargon** — Privy embedded wallets; email login; no seed phrases on the default path.
3. **Signup = free username** — every Privy registration in this app must pick an available label on the platform parent (`label.gift.eth` or the final parent we own). No address-only accounts.
4. **Bare names are ours** — send to `beeinger` → resolve `beeinger.gift.eth`. Explicit ENS (`beeinger.eth`, `foo.bar.eth`) still works via normal ENS. `0x…` still works.
5. **Links are the onboarding** — a gift is money behind a shareable code. ENS is not attached to the gift.
6. **On-chain truth for claims** — gift codes are commitments on-chain. Recipient proves knowledge of the preimage; the contract releases funds. No app DB as source of `code → amount`.
7. **Social by default** — when a gift is claimed, the sender is notified and the claimer is added as a contact (by their username / ENS).
8. **Money in one place** — add cash (Privy onramp) and spend (Privy card) on the same surface as balances.

---

## Core product

### Beautiful UI

Dashboard, onboarding, username picker, gift create/claim, contacts, and money (onramp + card) look finished.

### Onboarding (Privy + username)

Same path for gift claimers and people who just open the app:

1. Email login via Privy.
2. Embedded self-custodial wallet created on login.
3. **Pick a free username** (availability on our ENSv2 subregistry). App mints `username.<parent>.eth` to that wallet for **free** (platform parent; zero registrar price; gas sponsored if we can).
4. No dashboard until that name is set.

Default chain: **Sepolia** for gifts + ENSv2. Onramp/card follow Privy-supported chains.

### Name resolution (send / contacts)

| User types | Resolve as |
|---|---|
| `beeinger` (no dots) | `beeinger.<our-parent>.eth` (first-class username) |
| `beeinger.eth`, `alice.foo.eth`, any name with a dot | Standard ENS (Universal Resolver) |
| `0x…` | Address as-is |

Parent placeholder in docs: `gift.eth`. Swap when the live Sepolia 2LD is registered.

### Create a gift

Money only.

1. Sender chooses an amount (they already have a username).
2. App generates a secret code and commits `Poseidon(code)` on-chain.
3. ETH (or supported token) is **locked in the gift contract**.
4. Sender gets a shareable code link.

### Claim a gift

1. Recipient opens the link (code pre-filled).
2. If not logged in: Privy + username (same as any signup). If already a user: skip username.
3. Browser ZK proof that they know the code.
4. Contract verifies, pays the proven `msg.sender`, marks the gift claimed.
5. Sender is notified; claimer is added to the sender’s contacts under their username.

### Money (Privy)

Single money area on the dashboard:

- **Onramp (required):** live `useAddFunds` / fiat onramp ([funding docs](https://docs.privy.io/wallets/funding/add-funds)). Finish config, chain/asset, UX.
- **Card (required in UI, live when enabled):** [Privy Cards](https://docs.privy.io/financial-flows/cards) (Bridge + Stripe Issuing). Mock card in this screen is OK **if** onramp (or another live Privy financial flow) works; swap to live when Bridge is enabled.

### Contacts

- Beautiful list, search.
- Search by bare username (our subnames), full ENS, phone (Privy + device contacts where allowed).
- After a claim, both sides send again by name.

### Flows

```
Signup (always)
User -- Privy email + wallet --> pick free username --> registrar --> dashboard

Gift (money only)
Sender -- lock ETH + Poseidon(code) --> GiftClaimer
     -- share link ----------------------> Recipient
Recipient -- signup if needed
          -- ZK proof --> claim funds
Sender <-- notify + contact (their username)
```

**Invariant:** `code → amount` is not trusted to an app database. Only the commitment and a valid proof authorize release.

---

## ENSv2: how it works for this product (who pays)

Docs: [overview](https://docs.ens.domains/ensv2/overview), [app developers](https://docs.ens.domains/ensv2/tutorial-app-developers), [contract developers / subname registrar](https://docs.ens.domains/ensv2/tutorial-contract-developers), [Permissioned Registry](https://docs.ens.domains/ensv2/permissioned-registry), [Permissioned Resolver](https://docs.ens.domains/ensv2/permissioned-resolver), [Enhanced Access Control](https://docs.ens.domains/ensv2/enhanced-access-control).

ENSv2 is a **tree of registries**. `bob.gift.eth` is: root → `eth` → `gift` → `bob`. Parent points at a **subregistry**. Resolution walks that chain (Universal Resolver). Sepolia today; contracts may still change before mainnet.

| Layer | What | Who pays |
|---|---|---|
| **Parent 2LD** (`gift.eth` or the name we register) | ETH Registrar: fee + gas | **Platform** (once). Sepolia fee token is MockUSDC (`mint` is open) + Sepolia ETH for gas. |
| **Subnames** (`bob.gift.eth`) | Our UserRegistry + registrar; price is our code | **Free to users.** Gas for `register()` from user wallet or a platform relayer. |

Setup once: own parent → deploy UserRegistry → `setSubregistry` → deploy registrar with `ROLE_REGISTRAR` / `ROLE_RENEW` → `register(label, owner, …)` with EAC so the user owns the name.

Username mint happens at **Privy signup**, not inside the gift contract.

---

## Technical direction

| Layer | Choice | Role |
|---|---|---|
| **App** | Next.js + React | Web client, deep links, dashboard |
| **Auth & wallet** | Privy | Email login, embedded wallets, onramp, card |
| **Chain** | Ethereum **Sepolia** | Gifts, claims, ENSv2 |
| **Chain I/O** | viem | Reads, writes |
| **Gift commitments** | `GiftClaimer` (Solidity) | Poseidon commitment + locked ETH |
| **Claim verification** | Circom + snarkjs PLONK + on-chain verifier | Prove code knowledge; bind to claimant |
| **Identity** | ENSv2 parent + free subname registrar | Username at signup; bare-name resolve to our subnames |
| **Contacts & notifications** | App layer | Social graph — not fund truth |

App gift hashes today use `keccak256` in `lib/mock-chain.ts`. The ZK circuit uses **Poseidon**. Production commitments must match the circuit (`zk-wip/README.md`).

---

## ETHOnline 2026 — what we build toward

### ENS — Best Use of ENSv2 ($4,500)

Parent namespace + live subname registry + EAC + Permissioned Resolver. Every user is a real subname. Send-to-`beeinger` uses that namespace. [ENSv2 overview](https://docs.ens.domains/ensv2/overview). Continuity $500: skip unless on Continuity.

### Privy — Best financial flow ($2,500)

Embedded wallets, gift lock/claim, **live onramp**, send-to-username. Card in the same money UI ([Privy](https://docs.privy.io/), [add funds](https://docs.privy.io/wallets/funding/add-funds), [cards](https://docs.privy.io/financial-flows/cards)). B2B prize: out of scope.

---

## Success criteria

1. Non-crypto user can receive a first payment in under two minutes from a link (signup + username + claim).
2. Every Privy user in the app has an ENSv2 subname that resolves to their wallet.
3. Send to `beeinger` hits `beeinger.<parent>.eth`; send to `beeinger.eth` hits that name.
4. Gift claims authorized only by on-chain proof of the commitment.
5. Add cash uses Privy onramp. Card spend is in that same money place.
6. App feels cute/simple.

---

## Non-goals (for now)

- Attaching or reserving an ENS name on a gift.
- Full DeFi suite except what onramp/card/send need.
- Seed-phrase power-user path as default.
- Every chain on day one.
- App DB as source of truth for gift amounts.
- Charging users for subnames.
- Privy B2B / Continuity ENS prizes unless those tracks apply.

---

## Source

Product voice: 2026-09-08 recording. Prize pages and ENS/Privy docs: 2026-09-12. Progress: `README.md`.
