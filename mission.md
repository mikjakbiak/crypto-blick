# Mission

**Gifty is a social crypto wallet that lets anyone send money the way they already send messages — by name, link, or phone number — while keeping gift claims trust-minimized and on-chain.**

The product should feel like modern fintech (clear, cute, fast) without hiding that value moves on Ethereum. Primary growth loop: **gift → claim → contact → repeat send**.

Hackathon target: [ETHOnline 2026](https://ethglobal.com/events/ethonline2026) — [ENS](https://ethglobal.com/events/ethonline2026/prizes/ens) and [Privy](https://ethglobal.com/events/ethonline2026/prizes/privy).

---

## Problem

Crypto wallets still assume the user already understands addresses, networks, and seed phrases.

- Sending money means copying hex or teaching someone what a wallet is.
- Onboarding a friend means installing an app, backing up a key, and buying crypto first.
- Gift and referral flows often map codes to amounts in an off-chain database.

Gifty: a sender creates a gift link. The recipient opens it, signs in with Privy (email → embedded wallet), **chooses a free username** (our ENSv2 subname), proves they know the gift code, and receives funds. Username is an account step, not something the sender “sends.”

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
3. **Signup = free username** — every Privy registration in this app must pick an available label on `label.gifty.eth`. No address-only accounts.
4. **Bare names are ours** — send to `beeinger` → resolve `beeinger.gifty.eth`. Explicit ENS (`beeinger.eth`, `foo.bar.eth`) still works via normal ENS. `0x…` still works.
5. **Links are the onboarding** — a gift is money behind a shareable code. ENS is not attached to the gift.
6. **On-chain truth for claims** — gift codes are commitments on-chain. Recipient proves knowledge of the preimage; the contract releases funds. No app DB as source of `code → amount`.
7. **Social by default** — when a gift is claimed, the sender is notified and the claimer is added as a contact (by their username / ENS).
8. **Money in one place** — add cash (Privy onramp) and spend (card UI) on the same surface as balances.

---

## Core product

### Onboarding (Privy + username)

1. Email login via Privy.
2. Embedded self-custodial wallet created on login.
3. **Pick a free username** on Sepolia ENSv2. App mints `username.gifty.eth` for free (gas sponsored if the user has no Sepolia ETH).
4. No dashboard until that name is set.

Money lives on **Base**. ENS lives on **Sepolia**.

### Name resolution (send / contacts)

| User types | Resolve as |
|---|---|
| `beeinger` (no dots) | `beeinger.gifty.eth` |
| `beeinger.eth`, `alice.foo.eth`, any name with a dot | Standard ENS (Universal Resolver on Sepolia) |
| `0x…` | Address as-is |

### Create a gift

1. Sender chooses an amount.
2. App generates a secret code and commits `Poseidon(code)` on Base.
3. ETH is locked in `GiftyClaimer`.
4. Sender gets a shareable code link.

### Claim a gift

1. Recipient opens the link (code pre-filled).
2. If not logged in: Privy + username. If already a user: skip username.
3. Browser ZK proof that they know the code.
4. Contract verifies, pays the proven claimant, marks the gift claimed.

### Money (Privy)

- **Onramp:** live `useAddFunds` to Base ETH or Base USDC.
- **Card:** demo spend card in the dashboard. Live issuing needs Privy + Bridge onboarding.

### Flows

```
Signup (always)
User -- Privy email + wallet --> pick free username --> GiftyRegistrar (Sepolia) --> dashboard

Gift (money only, Base)
Sender -- lock ETH + Poseidon(code) --> GiftyClaimer
     -- share link ----------------------> Recipient
Recipient -- signup if needed
          -- ZK proof --> claim funds
```

**Invariant:** `code → amount` is not trusted to an app database. Only the commitment and a valid proof authorize release.

---

## ENSv2

Docs: [overview](https://docs.ens.domains/ensv2/overview).

ENSv2 is a tree of registries. `bob.gifty.eth` is: root → `eth` → `gifty` → `bob`. Parent points at a subregistry. Resolution walks that chain (Universal Resolver). Sepolia today.

| Layer | What | Who pays |
|---|---|---|
| **Parent 2LD** (`gifty.eth`) | ETH Registrar: fee + gas | Platform (once) |
| **Subnames** (`bob.gifty.eth`) | Our UserRegistry + `GiftyRegistrar` | Free to users. Gas from user or operator. |

---

## Technical direction

| Layer | Choice | Role |
|---|---|---|
| **App** | Next.js + React | Web client, deep links, dashboard |
| **Auth & wallet** | Privy | Email login, embedded wallets, onramp, demo card |
| **ENS chain** | Ethereum Sepolia | `gifty.eth` + `GiftyRegistrar` |
| **Money chain** | Base | `GiftyClaimer`, transfers, balances, onramp |
| **Gift commitments** | `GiftyClaimer` | Poseidon commitment + locked ETH |
| **Claim verification** | Circom `gifty_claim` + snarkjs PLONK + `GiftyVerifier` | Prove code knowledge; bind to claimant |

---

## ETHOnline 2026

### ENS — Best Use of ENSv2

Parent namespace + live subname registry + EAC + Permissioned Resolver. Every user is a real subname.

### Privy — Best financial flow

Embedded wallets, gift lock/claim, **live onramp** on Base. Card UI is mocked until Bridge is enabled.

---

## Success criteria

1. Non-crypto user can receive a first payment in under two minutes from a link (signup + username + claim).
2. Every Privy user in the app has an ENSv2 subname that resolves to their wallet.
3. Send to `beeinger` hits `beeinger.gifty.eth`.
4. Gift claims authorized only by on-chain proof of the commitment.
5. Add cash uses Privy onramp on Base. Card spend is shown in that same money place.
6. App feels cute/simple.
