// SPDX-License-Identifier: MIT

// Test constract 
pragma solidity ^0.8.0;
import './SkillToken.sol';
import './SnookToken.sol';
import './SnookGame.sol';
import "@openzeppelin/contracts/token/ERC20/utils/TokenTimelock.sol";


// https://ethereum.stackexchange.com/questions/68934/how-to-manage-big-loops-in-solidity
contract SpecialSkinRewards {
  uint private _periodicity;
  SkillToken private _skill;
  SnookToken private _snook;
  SnookGame private _game;
  mapping (address => TokenTimelock) public beneficiaryTokenTimelocks;

  constructor(address skill, address snook, address game, uint periodicity) {
    _periodicity = periodicity;
    _skill = SkillToken(skill);
    _snook = SnookToken(snook);
    _game = SnookGame(game);
  }

  function timelockRewards() public {
    uint balance = _skill.balanceOf(address(this));
    uint totalStars = 0;
    
    // calculate totals
    for (uint i=0; i<_snook.totalSupply(); i++) {
      uint tokenId = _snook.tokenByIndex(i);
      (,,uint stars) = _game.describe(tokenId);
      totalStars += stars;
    }

    // calculate reward PER token owner
    for (uint i=0; i<_snook.totalSupply(); i++) {
      uint tokenId = _snook.tokenByIndex(i);
      address beneficiary = _snook.ownerOf(tokenId);

      (,,uint stars) = _game.describe(tokenId);
      if (stars > 0) {
        uint amount = balance * stars / totalStars;
        
        uint releaseTime = block.timestamp + _periodicity * 1 days; 
        TokenTimelock tokenTimelock = new TokenTimelock(_skill, beneficiary, releaseTime);
        beneficiaryTokenTimelocks[beneficiary] = tokenTimelock;
        _skill.transfer(address(tokenTimelock), amount);
      }
    }
  } 
}