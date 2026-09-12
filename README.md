# Crypto Blick

Social gift wallet: send by link, username, or phone. Privy signup always includes a free ENSv2 username on our parent name. Gifts are money + a code. Spec: [`mission.md`](./mission.md).

## Run

```bash
bun install
bun dev
```

Needs `NEXT_PUBLIC_PRIVY_APP_ID` (optional `NEXT_PUBLIC_PRIVY_CLIENT_ID`). Privy default chain in code is Sepolia.

ZK lab (not wired into the Next app):

```bash
cd zk-wip
bun install
# see zk-wip/README.md
```

Root `package.json` still lists `pnpm`; use **bun**.

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

Legend: **done** · **partial** · **lab only** · **not started**

### Product

| Block | Status | Notes |
|---|---|---|
| UI (claim, login, dashboard) | **partial** | Teal / Fraunces / cards. Contacts and money hub still basic. |
| Privy email + embedded wallet | **partial** | `components/providers.tsx`: `createOnLogin`, Sepolia. No `loginMethods` lock in repo. |
| Username at every Privy signup | **partial** | Claim form asks for a label. Direct login can skip to dashboard with no name. Gift must **not** carry an ENS payload. |
| Bare username → our subname | **partial** | Mock `*.gift.eth` in `lib/mock-chain.ts`. Need: no-dot → `<label>.<parent>.eth`; dotted → Universal Resolver. |
| Gift link | **partial** | `/?code=…` from `SendGiftForm`; mock storage, same browser. |
| Lock funds in gift contract | **not started** | `saveGiftOnChain` writes keccak + amount to localStorage; no ETH lock. |
| ZK claim proof | **lab only** | `zk-wip/` Circom + PLONK. Next app not imported. keccak vs Poseidon mismatch. |
| On-chain payout | **lab only** | `zk-wip/contracts/src/GiftClaimer.sol`. App credits localStorage. |
| ENSv2 mint at signup | **not started** | localStorage map, not a registrar. |
| Notify sender + auto contact | **not started** | `lib/contacts.ts` is manual only. |
| Contacts UI + search | **partial** | Add/list/remove; no search, no phone. |
| Privy onramp | **partial** | Dashboard `useAddFunds` → mainnet USDC. Align chain/asset + money-hub UX. |
| Privy card | **not started** | [Cards](https://docs.privy.io/financial-flows/cards). Mock until Bridge; keep onramp live. |

### Chain

| Block | Status | Notes |
|---|---|---|
| Parent ENS name + subregistry on Sepolia | **not started** | |
| Free subname registrar + EAC to user | **not started** | |
| GiftClaimer + verifier on Sepolia | **not started** | Code in `zk-wip` only. |
| Replace `lib/mock-chain.ts` | **not started** | Still gifts, balances, ENS for the UI. |

### ZK lab (`zk-wip`) — already there

See `zk-wip/README.md`. Wire into the app; public Phase-1 ptau beyond lab.

---

## Layout

| Path | Role |
|---|---|
| `app/`, `components/`, `lib/` | Next.js app (Privy + mock chain today) |
| `zk-wip/` | Gift-claim ZK + Solidity lab |
| `mission.md` | Product, ENSv2 economics, prize targets |
