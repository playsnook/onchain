// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract SkillToken is ERC20, AccessControl {
  uint public INITIAL_SUPPLY = 12000;
  bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

  constructor() ERC20("SkillToken", "SKILL") {
    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    uint amount = INITIAL_SUPPLY * 10**decimals();
    _mint(_msgSender(), amount);
  }

  function burn(address from, uint256 amount) public {
    require(hasRole(BURNER_ROLE, _msgSender()), "Caller is not a burner");
    _burn(from, amount);
  }

}