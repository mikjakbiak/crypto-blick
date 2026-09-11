# Mission

**Crypto-blick is a simple, social crypto wallet that lets anyone send money the way they already send messages — by name, link, or phone number — while keeping claims trust-minimized and on-chain.**

We are building the on-ramp and wallet experience people expect from modern fintech (Revolut-level clarity and delight), without hiding the fact that value moves on-chain. The product should feel cute, fast, and obvious on first open.

---

## Problem

Crypto wallets are still built for people who already understand addresses, networks, and seed phrases. For everyone else:

- Sending money means copying long hex strings or explaining what a wallet is.
- Onboarding a friend means teaching them to install an app, back up a key, and buy crypto somewhere else first.
- Gift and referral flows usually depend on opaque off-chain databases that map codes to amounts.

Crypto-blick removes that friction. A sender creates a gift link; a recipient opens it, signs in with Google, picks a username, and claims funds — no prior crypto knowledge required.

---

## Who this is for

| Audience | Need |
|---|---|
| **Senders** | Send crypto to friends without lecturing them about wallets |
| **New recipients** | Receive a first payment through a link, not a lecture |
| **Returning users** | Hold a balance, add fiat, and pay contacts by `@username` |

The primary growth loop is **gift → claim → contact → repeat send**.

---

## Product principles

1. **Familiar UX first** — balances, contacts, and sends should feel like a neobank app, not a developer tool.
2. **Login before jargon** — Privy embedded wallets and social login (e.g. Google) hide key management until it matters.
3. **Names over addresses** — users send to `bob@gift.eth` (or equivalent namespace), phone numbers, or ENS — not raw `0x…` strings.
4. **Links are the onboarding** — every gift is a shareable deep link; opening it is the product demo.
5. **On-chain truth for claims** — gift codes are stored as commitments on-chain (hash + salt/nonce). The recipient proves knowledge of the code; the contract releases funds. No off-chain table that says “code X = 10 ETH”.
6. **Social by default** — when someone claims your gift, they become a contact you can pay again in one tap.
7. **Polish is the feature** — small UI, clear copy, and low cognitive load are not optional.

---

## Core flows

### 1. Sign up and wallet

1. User opens the app and signs in with Privy (e.g. Google).
2. An embedded wallet is created automatically.
3. User sees a simple portfolio view and can add funds via fiat on-ramp (Ramp through Privy).

### 2. Send a gift (onboard someone new)

1. Sender chooses an amount and creates a gift.
2. App generates a secret code and stores an **on-chain commitment** to that code (not the plaintext code).
3. Sender shares a link: `https://app.example/?code=…`
4. Funds are locked until claimed or expired (per contract rules).

### 3. Claim a gift (recipient onboarding)

1. Recipient opens the link and enters the code (pre-filled from URL).
2. Recipient picks an available username (e.g. `bob` → `bob.gift.eth`).
3. Recipient signs in with Privy; wallet is created if needed.
4. Recipient submits a **ZK proof** that they know the code preimage matching the on-chain hash.
5. Contract verifies the proof, releases funds to the recipient’s address, and marks the gift claimed.
6. Sender is notified; both users gain each other as contacts.

### 4. Send to a contact

1. User opens Send and chooses a saved contact or enters `@username`, ENS, phone, or address.
2. Transfer settles on-chain (direct send for existing users; gift flow for new users).

---

## Technical direction

| Layer | Choice | Role |
|---|---|---|
| **App** | Next.js + React | Web client, deep links, dashboard |
| **Auth & wallet** | Privy | Social login, embedded wallets, on-ramp |
| **Chain interaction** | viem | Reads, writes, hashing |
| **Gift commitments** | Smart contract | Stores `hash(code, salt)` and order metadata on-chain |
| **Claim verification** | ZK program + on-chain verifier | Proves code knowledge without revealing the code; matches commitment; triggers payout |
| **Identity** | App namespace + ENS | Human-readable names (`*.gift.eth` or project domain); ENS integration TBD (on-chain vs registrar vs mock) |
| **Contacts & notifications** | App backend / client state | Social graph and “your code was claimed by Bob” — off-chain UX layer, not source of fund truth |

### Claim model (target)

```
Sender                          Chain                         Recipient
  |                               |                               |
  |-- create gift --------------->| store commitment H(code,salt) |
  |                               | store order (amount, expiry)    |
  |-- share link/code -------------------------------------------->|
  |                               |                               |-- ZK proof: knows code
  |                               |<-- verify proof ---------------|
  |                               |-- transfer funds ------------->|
  |<-- notification (off-chain) ---|                               |
```

**Invariant:** the mapping `code → amount` is not trusted to an app database. Only the commitment and the proof path on-chain authorize release.

---

## Current state vs roadmap

### Built (prototype)

- Privy auth and embedded wallet
- Dashboard: portfolio, send gift, send ETH, contacts
- Gift link generation and claim UI with username registration (`*.gift.eth` namespace in mock layer)
- Fiat on-ramp entry point via Privy `addFunds`
- Mock “chain” in `lib/mock-chain.ts` (localStorage) for gifts, balances, and ENS — **not production security**

### Next (from product vision)

- [ ] Real smart contract for gift commitments and payouts
- [ ] ZK claim circuit and on-chain verifier
- [ ] Replace mock chain with contract calls
- [ ] Sender notification when a gift is claimed
- [ ] Auto-add claimer to sender’s contacts
- [ ] Send by phone number (where Privy / infra supports it)
- [ ] Production domain and branded username namespace
- [ ] Hardening: expiry, cancellation, rate limits, monitoring

---

## Success criteria

We are succeeding when:

1. A non-crypto user can receive their first payment in under two minutes from opening a link.
2. A returning user can pay a contact by username without touching an address.
3. Gift claims are authorized only by on-chain verification of the code commitment.
4. The app feels good enough that people describe it as “cute” or “simple” — not “crypto”.

---

## Non-goals (for now)

- Full DeFi suite (swaps, staking, NFT gallery)
- Self-custody power-user features as the default path
- Supporting every chain on day one
- Storing gift secrets or amount mappings in a centralized database as the source of truth

---

## Source

This document is derived from the product voice note recorded 2026-09-08 and aligned with the current `crypto-blick` codebase. For the raw transcript, see `signal-2026-09-08-15-45-38-830.md` in the project owner’s Documents folder.
