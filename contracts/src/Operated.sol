// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @notice Two-step Ownable plus a rotatable operator for sponsored txs.
abstract contract Operated is Ownable2Step {
    address public operator;

    event OperatorUpdated(address indexed previousOperator, address indexed newOperator);

    error NotOperator();
    error ZeroAddress();

    constructor() Ownable(msg.sender) {
        operator = msg.sender;
        emit OperatorUpdated(address(0), msg.sender);
    }

    modifier onlyOperator() {
        if (msg.sender != operator) revert NotOperator();
        _;
    }

    function setOperator(address newOperator) external onlyOwner {
        if (newOperator == address(0)) revert ZeroAddress();
        address previous = operator;
        operator = newOperator;
        emit OperatorUpdated(previous, newOperator);
    }
}
