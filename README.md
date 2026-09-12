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
