// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import './SkillToken.sol';
import './SnookGame.sol';

contract Treasury is Ownable {
  enum PayeeIds { FOUNDERS, STAKING, GAME }
  uint constant PayeeCount = 3;
  uint constant ToPercent = 100; // devide shares by that factor

  // payees should be in the order defined by PayeeIds
  address[PayeeCount] private _payees;
  uint[PayeeCount] private _shares; // in hunderedth of percent, 1 = 0.01%
  uint[PayeeCount] private _cycles;
  
  uint[PayeeCount] private _payTimes;
  SkillToken private _skill;
  bool _initialized;
  constructor(address skill) 
  {
    _initialized = false;
    _skill = SkillToken(skill);
  }

  function initialize(
    address[PayeeCount] memory payees, 
    uint[PayeeCount] memory shares, 
    uint[PayeeCount] memory cycles
  ) public onlyOwner
  {
    require(_initialized == false, 'Already initialized');
    require(_sharesOk(shares) == true, "Invalid shares");
    _payees = payees;
    _shares = shares;
    _cycles = cycles;
    _initialized = true;
  }

  function _sharesOk(uint[PayeeCount] memory shares) public pure returns (bool) {
    uint sum = 0;
    for (uint i=0; i<PayeeCount; i++) {
      sum += shares[i] / ToPercent;
    }
    bool ok = false;
    if (sum <= 100) {
      ok = true;
    }
    return ok;
  }

  function transfer() public {
    uint balance = _skill.balanceOf(address(this));

    for (uint i=0; i< PayeeCount; i++) {
      address payee = _payees[i];
      if (_payTimes[i] + _cycles[i] * 1 seconds < block.timestamp) {
        uint amount = balance * _shares[i] / ToPercent / 100;
        _skill.transfer(payee, amount);
        _payTimes[i] = block.timestamp;

        if (PayeeIds(i) == PayeeIds.GAME) {
          SnookGame game = SnookGame(_payees[i]);
          uint releaseTime = block.timestamp + _cycles[i] * 1 seconds;
          game.startNewPeriod(amount, releaseTime);
        }
      }
    }
  }
} 