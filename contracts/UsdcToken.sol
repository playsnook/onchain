// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

// for debug
import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract UsdcToken is ERC20 {
  uint public INITIAL_SUPPLY = 100000;
  
  constructor() ERC20("UsdcToken", "USDC") {
    uint amount = INITIAL_SUPPLY * 10**decimals(); 
    _mint(msg.sender, amount);
  }
}