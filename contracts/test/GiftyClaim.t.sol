// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {GiftyClaimer} from "../src/GiftyClaimer.sol";
import {Operated} from "../src/Operated.sol";
import {GiftyVerifier} from "../src/GiftyVerifier.sol";

contract GiftyClaimTest is Test {
    GiftyClaimer internal claimer;

    address internal constant ALICE = address(uint160(0xA1));
    address internal constant BOB = address(uint160(0xB2));

    uint256[24] internal aliceProof;
    uint256[2] internal aliceSignals;

    function setUp() public {
        claimer = new GiftyClaimer(address(new GiftyVerifier()));
        _loadAlice();
        claimer.createGift{value: 1 ether}(aliceSignals[0]);
    }

    function test_claimPaysProvenAddress() public {
        uint256 beforeBal = ALICE.balance;
        vm.prank(ALICE);
        claimer.claim(aliceProof, aliceSignals);
        assertEq(ALICE.balance, beforeBal + 1 ether);
        (,, bool claimed) = claimer.gifts(aliceSignals[0]);
        assertTrue(claimed);
    }

    function test_proofDoesNotWorkForOtherAddress() public {
        uint256[2] memory swapped = aliceSignals;
        swapped[1] = uint256(uint160(BOB));
        vm.prank(BOB);
        vm.expectRevert(GiftyClaimer.InvalidProof.selector);
        claimer.claim(aliceProof, swapped);
    }

    function test_msgSenderMustMatchProvenClaimant() public {
        vm.prank(BOB);
        vm.expectRevert(GiftyClaimer.ClaimantMismatch.selector);
        claimer.claim(aliceProof, aliceSignals);
    }

    function test_doubleClaimReverts() public {
        vm.prank(ALICE);
        claimer.claim(aliceProof, aliceSignals);
        vm.prank(ALICE);
        vm.expectRevert(GiftyClaimer.AlreadyClaimed.selector);
        claimer.claim(aliceProof, aliceSignals);
    }

    function test_createGiftStoresHashNotCode() public view {
        (address sender, uint128 amount, bool claimed) = claimer.gifts(aliceSignals[0]);
        assertEq(sender, address(this));
        assertEq(amount, 1 ether);
        assertFalse(claimed);
    }

    function test_createGiftBelowMinReverts() public {
        vm.expectRevert(GiftyClaimer.GiftTooSmall.selector);
        claimer.createGift{value: 0.0009 ether}(uint256(keccak256("small")));
    }

    function test_claimForPaysClaimantMinusFee() public {
        uint256 fee = claimer.operatorFee();
        uint256 beforeBal = ALICE.balance;
        claimer.claimFor(aliceProof, aliceSignals);
        assertEq(ALICE.balance, beforeBal + 1 ether - fee);
        assertEq(claimer.ownerFunds(), fee);
        (,, bool claimed) = claimer.gifts(aliceSignals[0]);
        assertTrue(claimed);
    }

    function test_claimForRejectsNonOperator() public {
        vm.prank(BOB);
        vm.expectRevert(Operated.NotOperator.selector);
        claimer.claimFor(aliceProof, aliceSignals);
    }

    function test_setOperatorRotatesClaimFor() public {
        claimer.setOperator(BOB);
        vm.prank(BOB);
        claimer.claimFor(aliceProof, aliceSignals);
        (,, bool claimed) = claimer.gifts(aliceSignals[0]);
        assertTrue(claimed);
    }

    function test_twoStepOwnershipThenWithdraw() public {
        claimer.claimFor(aliceProof, aliceSignals);
        uint256 fee = claimer.ownerFunds();
        address nextOwner = address(uint160(0xD00));
        claimer.transferOwnership(nextOwner);
        assertEq(claimer.owner(), address(this));
        vm.prank(nextOwner);
        claimer.acceptOwnership();
        assertEq(claimer.owner(), nextOwner);

        uint256 beforeBal = nextOwner.balance;
        vm.prank(nextOwner);
        claimer.withdrawOwnerFunds();
        assertEq(nextOwner.balance, beforeBal + fee);
    }

    function test_nonOwnerCannotWithdraw() public {
        claimer.claimFor(aliceProof, aliceSignals);
        vm.prank(BOB);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, BOB));
        claimer.withdrawOwnerFunds();
    }

    function test_withdrawOwnerFunds() public {
        claimer.claimFor(aliceProof, aliceSignals);
        uint256 fee = claimer.ownerFunds();
        uint256 beforeBal = address(this).balance;
        claimer.withdrawOwnerFunds();
        assertEq(claimer.ownerFunds(), 0);
        assertEq(address(this).balance, beforeBal + fee);
    }

    function test_setOperatorFeeCapped() public {
        claimer.setOperatorFee(0.0001 ether);
        assertEq(claimer.operatorFee(), 0.0001 ether);
        vm.expectRevert(GiftyClaimer.FeeTooHigh.selector);
        claimer.setOperatorFee(0.00076 ether);
    }

    function test_directClaimTakesNoFee() public {
        vm.prank(ALICE);
        claimer.claim(aliceProof, aliceSignals);
        assertEq(claimer.ownerFunds(), 0);
    }

    receive() external payable {}

    function _loadAlice() internal {
        string memory json = vm.readFile(string.concat(vm.projectRoot(), "/../artifacts/fixtures/alice.json"));
        for (uint256 i; i < 24; i++) {
            aliceProof[i] = vm.parseJsonUint(json, string.concat(".p", vm.toString(i)));
        }
        aliceSignals[0] = vm.parseJsonUint(json, ".codeHash");
        aliceSignals[1] = vm.parseJsonUint(json, ".claimantField");
    }
}
