// SPDX-License-Identifier: MIT

// Test constract 
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/utils/TokenTimelock.sol";
import './SkillToken.sol';

contract SnookFoundationRewards {
  address private _beneficiary; // multosig address of founders
  SkillToken private _skillToken;
  TokenTimelock public tokenTimelock;
  
  constructor(address skillToken, address beneficiary) {
    _beneficiary = beneficiary;
    _skillToken = SkillToken(skillToken);
  }

  function timelockRewards(uint amount, uint releaseTime) public returns(TokenTimelock) {
    require(_skillToken.balanceOf(address(this)) >= amount, 'Not enough balance on SFR contract');
    tokenTimelock = new TokenTimelock(_skillToken, _beneficiary, releaseTime);
    _skillToken.transfer(address(tokenTimelock), amount);
    return tokenTimelock;
  }
}