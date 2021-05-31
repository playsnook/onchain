// SPDX-License-Identifier: MIT

// Test constract 
pragma solidity ^0.8.0;
import './SkillToken.sol';
import './SnookToken.sol';

// Created by Treasury, balance is updated by Treasury
contract SpecialSkinRewards {

  bool private _activated;
  uint private _totalStars;
  SnookToken private _snook;
  SkillToken private _skill;
  address _game;
  uint _balance;
  uint _releaseTime; 
  mapping(uint => uint) private _snookStars; // snookId <=> stars mapping
  mapping(address => bool) private _rewarded; 

  constructor(SkillToken skill, SnookToken snook, address game, uint balance, uint releaseTime) {
    _snook = snook;
    _skill = skill;
    _game = game;
    _balance = balance;
    _releaseTime = releaseTime;
    _totalStars = 0;
  }

  function update(uint tokenId, uint stars) public {
    require(msg.sender == _game, 'Only SnookGame can call it');
    _totalStars = _totalStars  - _snookStars[tokenId] + stars;
    _snookStars[tokenId] = stars;
  }

  function _computeRewardAmount(address snookOwner) private view returns (uint) {
    uint stars = 0;
    uint senderSnookCount = _snook.balanceOf(snookOwner);
    for (uint i = 0; i < senderSnookCount; i++) {
      uint tokenId = _snook.tokenOfOwnerByIndex(snookOwner, i);
      stars += _snookStars[tokenId];
    }
    uint amount = _balance * stars / _totalStars;
    return amount;
  }

  // user pulls rewards to himself
  function getRewards() public {
    require(_releaseTime <= block.timestamp, 'Rewards are yet not released');
    require(_rewarded[msg.sender] == false, 'Already rewarded');
    uint amount = _computeRewardAmount(msg.sender);
    _rewarded[msg.sender] = true;
    _skill.transfer(msg.sender, amount); 
  }
}