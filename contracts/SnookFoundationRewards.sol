// SPDX-License-Identifier: MIT

// Test constract 
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/utils/TokenTimelock.sol";
import './SkillToken.sol';

contract SnookFoundationRewards {
  address private _beneficiary; // multisig address of founders
  SkillToken private _skill;
  uint private _periodicity; // in seconds
  TokenTimelock public tokenTimelock;
  
  constructor(address skillToken, address beneficiary, uint periodicity) {
    _beneficiary = beneficiary;
    _periodicity = periodicity;
    _skill = SkillToken(skillToken);
  }

  function timelockRewards() public {
    uint balance = _skill.balanceOf(address(this));
    uint releaseTime = block.timestamp + _periodicity * 1 seconds;
    tokenTimelock = new TokenTimelock(_skill, _beneficiary, releaseTime);
    _skill.transfer(address(tokenTimelock), balance);
  }
}