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
  mapping (address => uint) private _beneficiaryRewards;


  constructor(address skill, address snook, address game, uint periodicity) {
    _periodicity = periodicity;
    _skill = SkillToken(skill);
    _snook = SnookToken(snook);
    _game = SnookGame(game);
  }

  function getTokenTimelock(address beneficiary) public view returns (TokenTimelock) {
    return beneficiaryTokenTimelocks[beneficiary];
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
        _beneficiaryRewards[beneficiary] += amount;
      }
    }

    // timelock rewards
    uint releaseTime = block.timestamp + _periodicity * 1 seconds; 
    for (uint i=0; i < _snook.totalSupply(); i++) {
      uint tokenId = _snook.tokenByIndex(i);
      address beneficiary = _snook.ownerOf(tokenId);
      TokenTimelock tokenTimelock = new TokenTimelock(_skill, beneficiary, releaseTime);
      beneficiaryTokenTimelocks[beneficiary] = tokenTimelock;
      uint amount = _beneficiaryRewards[beneficiary];
      _beneficiaryRewards[beneficiary] = 0;
      _skill.transfer(address(tokenTimelock), amount);
    }
  } 
}