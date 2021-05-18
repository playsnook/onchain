// SPDX-License-Identifier: MIT

// Test constract 
pragma solidity ^0.8.0;
import './SkillToken.sol';

// https://ethereum.stackexchange.com/questions/68934/how-to-manage-big-loops-in-solidity
contract SpecialSkinRewards {
  uint private _periodicity;
  SkillToken private _skillToken;
  constructor(address skillToken, uint periodicity) {
    _periodicity = periodicity;
    _skillToken = SkillToken(skillToken);
  }

  function timelockRewards() public {
    
  } 
}