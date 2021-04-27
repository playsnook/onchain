// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

// for debug
import "hardhat/console.sol";


contract SkillToken is ERC20, AccessControl {
  uint public INITIAL_SUPPLY = 12000;
  bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

  function decimals() public pure override returns (uint8) {
    return 2;
  }

  constructor() ERC20("SkillToken", "SKILL") {
    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _mint(_msgSender(), INITIAL_SUPPLY);
  }

  function burn(address from, uint256 amount) public {
    require(hasRole(BURNER_ROLE, _msgSender()), "Caller is not a burner");
    _burn(from, amount);
  }

}