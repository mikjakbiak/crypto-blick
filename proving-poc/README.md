# Gift-claim proving POC

Browser-generated PLONK proof that the prover knows a gift code. On-chain verification on EVM. The code never leaves the client. The proof is bound to a claimant address, so it cannot be replayed for anyone else.

This folder is a standalone lab for the claim path in `mission.md`. It does not replace the mock chain in the Next.js app.

## Why PLONK

The product constraint is: prove knowledge of a gift code **in the browser**, verify on EVM, **no circuit-specific MPC**. Same Circom circuit was measured three ways:

| | Groth16 | **PLONK (this POC)** | UltraHonk |
|---|---|---|---|
| Circuit-specific MPC | Required (Phase 2 zkey) | **None** (universal ptau) | None |
| Prove (Node, this box) | 266–275 ms | **591–607 ms (~2.2×)** | 769 ms (~2.8×) |
| Claim gas | 275,683 | **371,682 (~1.35×, +96k)** | 2,671,614 (~9.7×) |
| Proof size | ~256 B | **~768 B** (`uint256[24]`) | 6.7 KB |
| Browser stack | snarkjs WASM | **same snarkjs WASM** | nargo + bb.js |

UltraHonk also skips a ceremony, but the claim is almost 10× Groth16 gas and the client is heavier. Groth16 is cheaper only with a real Phase-2 ceremony. This repo ships **snarkjs PLONK**.

The current app hashes gift codes with `keccak256` in `lib/mock-chain.ts`. That hash cannot be proven cheaply in-browser. Production commitments must be Poseidon, computed with the same packing as this circuit.

**Not Herodotus / Atlantic.** Those products prove chain state or Cairo programs on a server. Sending the code to a proving API would break the secrecy requirement.

## Circuit

`circuit/gift_claim.circom`

- **Private inputs:** `code[2]` (UTF-8 gift code packed into two 31-byte field limbs), `claimant` (uint160).
- **Work:** `codeHash = Poseidon(code[0], code[1])`. Claimant is range-checked to 160 bits.
- **Public outputs:** `codeHash`, `claimantOut`.

The claimant is **not** mixed into the hash. The sender commits before the recipient exists, so the on-chain value can only be `Poseidon(code)`. Address binding is the public-signal list: changing `claimantOut` invalidates the proof.

On-chain `GiftClaimer` also requires `msg.sender == address(uint160(publicSignals[1]))`, so a leaked proof still cannot be submitted by a different wallet.

Encoding: big-endian packed UTF-8, 31 bytes per limb, unused limb = 0. Max 62 bytes. App gift codes today are 32 hex characters (32 UTF-8 bytes), which fit.

## Protocol

```
Sender                         Chain                         Recipient browser
  |                              |                                  |
  | Poseidon(code) ------------->| store commitment + ETH           |
  | share code ----------------------------------------->           |
  |                              |                    prove locally |
  |                              |<-- proof, (hash, address) -------|
  |                              | verify + pay proven address      |
```

Invariant: `code → amount` is not trusted to an app database. Only the commitment and a valid proof release funds.

## Run

Needs `bun`, `forge` / `anvil`, Node (snarkjs workers crash under Bun), and `circom`.

```bash
# circom 2.2.3 — macOS binary also ran on Apple Silicon in this repo
mkdir -p .bin
curl -L -o .bin/circom https://github.com/iden3/circom/releases/download/v2.2.3/circom-macos-amd64
chmod +x .bin/circom

cd proving-poc
bun install
forge install foundry-rs/forge-std --no-git --root contracts
bun run setup          # compile circuit, PLONK zkey, fixtures, Solidity verifier
bun run test           # circuit checks + Foundry on-chain tests
bun run e2e            # deploy to a throwaway anvil and claim
bun run web            # http://localhost:5173 — prove in the browser
```

`bun run setup` compiles the circuit with circom, then runs snarkjs under **Node**. It generates a local Powers of Tau file (`2^10`) and a PLONK zkey from that universal ptau. There is no circuit-specific Phase 2. The local ptau is enough for this lab; production should download a public Phase-1 ptau (PSE Perpetual Powers of Tau).

Browser proving uses snarkjs from `/snarkjs.min.js` (copied from the local package, not a CDN) because the page sets COOP/COEP.

## What the tests prove

- Public `codeHash` equals Poseidon of the private code.
- A valid PLONK proof verifies.
- The same proof with a different claimant public signal does **not** verify.
- `GiftClaimer` pays the proven address (371,682 gas in this POC).
- `GiftClaimer` reverts `InvalidProof` if the claimant signal is swapped.
- `GiftClaimer` reverts `ClaimantMismatch` if `msg.sender` is not the proven address.

## Production notes

- Ship PLONK. Download a public Phase-1 ptau; do not reuse this repo’s local `2^10` file.
- Keep Poseidon parameters identical across circuit, JS (`poseidon-lite` / circomlibjs), and any future on-chain hasher.
- Do not put keccak commitments on-chain if claims are Poseidon proofs.
- circomlib is GPL-3.0. Fine for this lab; product integration should confirm license posture or replace the Poseidon template.
