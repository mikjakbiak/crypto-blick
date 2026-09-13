// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Operated} from "./Operated.sol";

interface IPlonkVerifier {
    function verifyProof(uint256[24] calldata _proof, uint256[2] calldata _pubSignals) external view returns (bool);
}

/// @notice Gift claim: Poseidon(code) commitment, snarkjs PLONK proof bound to claimant.
/// @dev Creating a gift is always paid by msg.sender. Operator only sponsors claims.
contract GiftClaimer is Operated, ReentrancyGuard {
    uint256 public constant MIN_GIFT = 0.001 ether;
    uint256 public constant MAX_OPERATOR_FEE = 0.00075 ether;

    IPlonkVerifier public immutable verifier;

    uint256 public operatorFee;
    uint256 public ownerFunds;

    struct Gift {
        address sender;
        uint128 amount;
        bool claimed;
    }

    mapping(uint256 codeHash => Gift) public gifts;

    event GiftCreated(uint256 indexed codeHash, address indexed sender, uint256 amount);
    event GiftClaimed(uint256 indexed codeHash, address indexed claimant, uint256 paid, uint256 fee);
    event OperatorFeeSet(uint256 fee);
    event OwnerFundsWithdrawn(address indexed to, uint256 amount);

    error InvalidProof();
    error UnknownGift();
    error AlreadyClaimed();
    error GiftExists();
    error ClaimantMismatch();
    error GiftTooSmall();
    error TransferFailed();
    error FeeTooHigh();
    error FeeExceedsGift();
    error NothingToWithdraw();

    constructor(address verifier_) {
        verifier = IPlonkVerifier(verifier_);
        operatorFee = 0.0005 ether;
    }

    function setOperatorFee(uint256 fee) external onlyOperator {
        if (fee > MAX_OPERATOR_FEE) revert FeeTooHigh();
        operatorFee = fee;
        emit OperatorFeeSet(fee);
    }

    function withdrawOwnerFunds() external onlyOwner nonReentrant {
        uint256 amount = ownerFunds;
        if (amount == 0) revert NothingToWithdraw();
        ownerFunds = 0;
        address to = owner();
        (bool ok,) = payable(to).call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit OwnerFundsWithdrawn(to, amount);
    }

    function createGift(uint256 codeHash) external payable {
        if (msg.value < MIN_GIFT) revert GiftTooSmall();
        Gift storage gift = gifts[codeHash];
        if (gift.sender != address(0)) revert GiftExists();
        gift.sender = msg.sender;
        gift.amount = uint128(msg.value);
        emit GiftCreated(codeHash, msg.sender, msg.value);
    }

    function claim(uint256[24] calldata proof, uint256[2] calldata publicSignals) external nonReentrant {
        address claimant = address(uint160(publicSignals[1]));
        if (claimant != msg.sender) revert ClaimantMismatch();
        _claim(proof, publicSignals, claimant, 0);
    }

    function claimFor(uint256[24] calldata proof, uint256[2] calldata publicSignals)
        external
        onlyOperator
        nonReentrant
    {
        address claimant = address(uint160(publicSignals[1]));
        _claim(proof, publicSignals, claimant, operatorFee);
    }

    function _claim(uint256[24] calldata proof, uint256[2] calldata publicSignals, address claimant, uint256 fee)
        internal
    {
        uint256 codeHash = publicSignals[0];
        Gift storage gift = gifts[codeHash];
        if (gift.sender == address(0)) revert UnknownGift();
        if (gift.claimed) revert AlreadyClaimed();
        if (fee > gift.amount) revert FeeExceedsGift();
        if (!verifier.verifyProof(proof, publicSignals)) revert InvalidProof();

        gift.claimed = true;
        uint256 paid = gift.amount - fee;
        if (fee != 0) ownerFunds += fee;

        (bool ok,) = payable(claimant).call{value: paid}("");
        if (!ok) revert TransferFailed();
        emit GiftClaimed(codeHash, claimant, paid, fee);
    }
}
