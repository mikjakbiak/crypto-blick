// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {GiftClaimer} from "../src/GiftClaimer.sol";
import {PlonkVerifier} from "../src/PlonkVerifier.sol";

contract GiftClaimTest is Test {
    GiftClaimer internal claimer;

    address internal constant ALICE = address(uint160(0xA1));
    address internal constant BOB = address(uint160(0xB2));

    uint256[24] internal aliceProof;
    uint256[2] internal aliceSignals;

    function setUp() public {
        claimer = new GiftClaimer(address(new PlonkVerifier()));
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
        vm.expectRevert(GiftClaimer.InvalidProof.selector);
        claimer.claim(aliceProof, swapped);
    }

    function test_msgSenderMustMatchProvenClaimant() public {
        vm.prank(BOB);
        vm.expectRevert(GiftClaimer.ClaimantMismatch.selector);
        claimer.claim(aliceProof, aliceSignals);
    }

    function test_doubleClaimReverts() public {
        vm.prank(ALICE);
        claimer.claim(aliceProof, aliceSignals);
        vm.prank(ALICE);
        vm.expectRevert(GiftClaimer.AlreadyClaimed.selector);
        claimer.claim(aliceProof, aliceSignals);
    }

    function test_createGiftStoresHashNotCode() public view {
        (address sender, uint128 amount, bool claimed) = claimer.gifts(aliceSignals[0]);
        assertEq(sender, address(this));
        assertEq(amount, 1 ether);
        assertFalse(claimed);
    }

    function _loadAlice() internal {
        string memory json = vm.readFile(string.concat(vm.projectRoot(), "/../artifacts/fixtures/alice.json"));
        for (uint256 i; i < 24; i++) {
            aliceProof[i] = vm.parseJsonUint(json, string.concat(".p", vm.toString(i)));
        }
        aliceSignals[0] = vm.parseJsonUint(json, ".codeHash");
        aliceSignals[1] = vm.parseJsonUint(json, ".claimantField");
    }
}
