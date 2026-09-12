// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPlonkVerifier {
    function verifyProof(uint256[24] calldata _proof, uint256[2] calldata _pubSignals) external view returns (bool);
}

/// @notice Gift claim: Poseidon(code) commitment, snarkjs PLONK proof bound to msg.sender.
contract GiftClaimer {
    IPlonkVerifier public immutable verifier;

    struct Gift {
        address sender;
        uint128 amount;
        bool claimed;
    }

    mapping(uint256 codeHash => Gift) public gifts;

    event GiftCreated(uint256 indexed codeHash, address indexed sender, uint256 amount);
    event GiftClaimed(uint256 indexed codeHash, address indexed claimant, uint256 amount);

    error InvalidProof();
    error UnknownGift();
    error AlreadyClaimed();
    error GiftExists();
    error ClaimantMismatch();
    error ZeroValue();
    error TransferFailed();

    constructor(address verifier_) {
        verifier = IPlonkVerifier(verifier_);
    }

    function createGift(uint256 codeHash) external payable {
        if (msg.value == 0) revert ZeroValue();
        Gift storage gift = gifts[codeHash];
        if (gift.sender != address(0)) revert GiftExists();
        gift.sender = msg.sender;
        gift.amount = uint128(msg.value);
        emit GiftCreated(codeHash, msg.sender, msg.value);
    }

    function claim(uint256[24] calldata proof, uint256[2] calldata publicSignals) external {
        uint256 codeHash = publicSignals[0];
        address claimant = address(uint160(publicSignals[1]));
        if (claimant != msg.sender) revert ClaimantMismatch();

        Gift storage gift = gifts[codeHash];
        if (gift.sender == address(0)) revert UnknownGift();
        if (gift.claimed) revert AlreadyClaimed();
        if (!verifier.verifyProof(proof, publicSignals)) revert InvalidProof();

        gift.claimed = true;
        uint256 amount = gift.amount;
        (bool ok,) = payable(claimant).call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit GiftClaimed(codeHash, claimant, amount);
    }
}
