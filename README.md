# Crypto Blick

Social gift wallet on Ethereum Sepolia. Send by link, username, or address. Privy signup mints a free ENSv2 username. Gifts lock ETH behind a Poseidon commitment and a browser PLONK proof. Spec: [`mission.md`](./mission.md).

## Run

```bash
bun install
bun run zk:setup    # once: circuit, zkey, PlonkVerifier.sol, public/zk artifacts
bun run deploy:sepolia
bun dev
```

Env: see `.env.example`. `ALCHEMY_API_KEY` stays server-side (`/api/rpc`, `/api/balances`, `/api/ens`). Deployer key is `DEPLOYER_PRIVATE_KEY`. After deploy, `NEXT_PUBLIC_GIFT_CLAIMER`, `NEXT_PUBLIC_USERNAME_REGISTRAR`, and `NEXT_PUBLIC_ENS_PARENT` are written into `.env`.

Needs Foundry (`forge`) and `circom` on PATH or at `.bin/circom`.

Needs `NEXT_PUBLIC_PRIVY_APP_ID` (optional `NEXT_PUBLIC_PRIVY_CLIENT_ID`). Privy default chain in code is Sepolia.

## Layout

| Path | Role |
|---|---|
| `app/`, `components/`, `lib/` | Next.js app (Privy + Sepolia) |
| `contracts/` | `GiftClaimer`, `PlonkVerifier`, `FreeUsernameRegistrar` |
| `circuit/` | Circom gift-claim circuit |
| `lib/zk/` | Poseidon packing + browser prove helpers |
| `scripts/zk-setup.ts` | Circuit setup |
| `scripts/deploy-sepolia.ts` | Sepolia deploy + ENSv2 parent wiring |
| `mission.md` | Product spec |

---

## Build plan

1. **Privy login** — email + embedded wallet; username picker required before dashboard.
2. **ENSv2 namespace** — own parent on Sepolia; free subname registrar; `beeinger` → `beeinger.<parent>.eth`; dotted names via normal ENS.
3. **Gift contract** — `GiftClaimer` + PLONK verifier; lock ETH; Poseidon (replace keccak mock). Money only — no ENS on the gift.
4. **Claim UI** — signup if needed, then browser prove → payout.
5. **Money hub** — live Privy onramp; card UI (live when Bridge is enabled).
6. **Social** — claim → notify sender + add contact by username.
7. **Contacts** — search username / ENS / phone; polish UI.

---

## Progress tracker

As of 2026-09-12.

Legend: **done** · **partial** · **not started**

### Product

| Block | Status | Notes |
|---|---|---|
| UI (claim, login, dashboard) | **partial** | Teal / Fraunces / cards. Contacts and money hub still basic. |
| Privy email + embedded wallet | **partial** | `components/providers.tsx`: `createOnLogin`, Sepolia. No `loginMethods` lock in repo. |
| Username at every Privy signup | **done** | Dashboard blocks until `FreeUsernameRegistrar` mints a label. Gift has no ENS payload. |
| Bare username → our subname | **done** | No-dot → `<label>.gift.eth`. Dotted names go through Universal Resolver (`/api/ens`). |
| Gift link | **done** | `/?code=…` from `SendGiftForm`; claim proves on `GiftClaimer`. |
| Lock funds in gift contract | **done** | `createGift` locks ETH behind Poseidon(`code`) on Sepolia. |
| ZK claim proof | **done** | Browser snarkjs PLONK (`public/zk`). Circuit + `lib/zk` in the app. |
| On-chain payout | **done** | `GiftClaimer.claim` with PLONK verifier on Sepolia. |
| ENSv2 mint at signup | **done** | `FreeUsernameRegistrar` under `gift.eth`. |
| Notify sender + auto contact | **not started** | `lib/contacts.ts` is manual only. |
| Contacts UI + search | **partial** | Add/list/remove; no search, no phone. |
| Privy onramp | **partial** | Dashboard `useAddFunds` on Sepolia (`eip155:11155111`). Money-hub UX still thin. |
| Privy card | **not started** | [Cards](https://docs.privy.io/financial-flows/cards). Mock until Bridge; keep onramp live. |

### Chain

| Block | Status | Notes |
|---|---|---|
| Parent ENS name + subregistry on Sepolia | **done** | `gift.eth` registered on ENSv2 ETH registrar. UserRegistry + PermissionedResolver live. Addresses in `deployments/sepolia.json`. |
| Free subname registrar + EAC to user | **done** | `FreeUsernameRegistrar` `0x908D215B7A61d9A0F1Fd9Dc44A5Bd3589802D1a0`. |
| GiftClaimer + verifier on Sepolia | **done** | `GiftClaimer` `0x217D7d3D643180D248422064bb3B235277e1A5fA`. |
| Replace `lib/mock-chain.ts` | **done** | Deleted. Alchemy via `/api/rpc`, `/api/balances`, `/api/ens`. |

### ZK

Circuit, PLONK artifacts, and `PlonkVerifier.sol` live in-repo (`circuit/`, `public/zk/`, `contracts/`). `zk-wip/` gone. Setup: `bun run zk:setup`. ptau files stay local / gitignored.

---

## Layout (previous)

| Path | Role |
|---|---|
| `app/`, `components/`, `lib/` | Next.js app (Privy + mock chain today) |
| `zk-wip/` | Gift-claim ZK + Solidity lab |
| `mission.md` | Product, ENSv2 economics, prize targets |
