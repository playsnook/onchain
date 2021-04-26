// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract FakeDAE is ERC20 {
  uint public INITIAL_SUPPLY = 12000;
  function decimals() public pure override returns (uint8) {
    return 2;
  }
  constructor() ERC20("FakeDAE", "FAKEDAE") {
    _mint(msg.sender, INITIAL_SUPPLY);
  }
}