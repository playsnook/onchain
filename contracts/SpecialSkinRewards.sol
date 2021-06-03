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
  mapping (address => uint) private _beneficiaryRewards;


  constructor(address skill, address snook, address game, uint periodicity) {
    _periodicity = periodicity;
    _skill = SkillToken(skill);
    _snook = SnookToken(snook);
    _game = SnookGame(game);
  }


  // After calling this function the entire balance of the contract is used.
  // So after treasury allocation, only a single call to the function is possible,
  // other calls will be reverted because of zero balance.  
  function sendRewards() public {
    // TODO: https://ethereum.stackexchange.com/questions/68934/how-to-manage-big-loops-in-solidity
    uint balance = _skill.balanceOf(address(this));
    require(balance > 0, 'No funds in the reward contract');
    uint totalStars = 0;
    
    // Not count skins of dead tokens 

    // calculate totals
    for (uint i=0; i<_snook.totalSupply(); i++) {
      uint tokenId = _snook.tokenByIndex(i);
      (,,uint stars,uint deathTime) = _game.describe(tokenId);
      if (deathTime != 0) {
        continue;
      }
      totalStars += stars;
    }

    // calculate reward PER token owner
    for (uint i=0; i<_snook.totalSupply(); i++) {
      uint tokenId = _snook.tokenByIndex(i);
      address beneficiary = _snook.ownerOf(tokenId);
      (,,uint stars,uint deathTime) = _game.describe(tokenId);
      if (deathTime != 0) {
        continue;
      }
      if (stars > 0) {
        uint amount = balance * stars / totalStars; // CHECK DIVISION BY ZERO
        _beneficiaryRewards[beneficiary] += amount;
      }
    }

    for (uint i=0; i < _snook.totalSupply(); i++) {
      uint tokenId = _snook.tokenByIndex(i);
      address beneficiary = _snook.ownerOf(tokenId);
      uint amount = _beneficiaryRewards[beneficiary];
      if (amount > 0) {
        _beneficiaryRewards[beneficiary] = 0;
        _skill.transfer(beneficiary, amount);
      }
    }
  } 
}