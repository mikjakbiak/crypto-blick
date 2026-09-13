pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/bitify.circom";

// Gifty claim circuit.
//
// Private inputs:
//   code[2]  — gift code packed into two BN254 field limbs (31 bytes each)
//   claimant — Ethereum address as a uint160 field element
//
// Public outputs:
//   codeHash    — Poseidon(code[0], code[1])
//   claimantOut — the same claimant address, bound into the public signals
//
// The claiming address is NOT mixed into the hash. The on-chain commitment is
// created before the recipient exists, so it can only be Poseidon(code). The
// address is bound because PLONK verification includes every public signal:
// a proof for address A cannot be replayed for address B.
template GiftyClaim() {
    signal input code[2];
    signal input claimant;

    signal output codeHash;
    signal output claimantOut;

    component hasher = Poseidon(2);
    hasher.inputs[0] <== code[0];
    hasher.inputs[1] <== code[1];
    codeHash <== hasher.out;

    // Range-check to 160 bits so the field element cannot truncate to a
    // different EVM address when the contract does address(uint160(...)).
    component addrBits = Num2Bits(160);
    addrBits.in <== claimant;
    claimantOut <== claimant;
}

component main = GiftyClaim();
