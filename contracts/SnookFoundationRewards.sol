// SPDX-License-Identifier: MIT

// Test constract 
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/utils/TokenTimelock.sol";
import './SkillToken.sol';

contract SnookFoundationRewards {
  address private _beneficiary; // muliosig address of founders
  SkillToken private _skillToken;
  uint private _periodicity;
  TokenTimelock public tokenTimelock;
  
  constructor(address skillToken, address beneficiary, uint periodicity) {
    _beneficiary = beneficiary;
    _periodicity = periodicity;
    _skillToken = SkillToken(skillToken);
  }

  function timelockRewards() public returns(TokenTimelock) {
    uint balance = _skillToken.balanceOf(address(this));
    uint releaseTime = block.timestamp + _periodicity * 1 days;
    tokenTimelock = new TokenTimelock(_skillToken, _beneficiary, releaseTime);
    _skillToken.transfer(address(tokenTimelock), balance);
    return tokenTimelock;
  }
}