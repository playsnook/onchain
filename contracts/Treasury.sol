// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import './SkillToken.sol';
import './SnookGame.sol';

contract Treasury is Ownable {
  enum PayeeIds { FOUNDERS, GAME, STAKING }

  PayeeIds[] private _payeeIds;
  address[] private _payees;
  uint[] private _shares;
  uint[] private _cycles;
  uint[] private _payTimes;

  SkillToken private _skill;
  bool _initialized;
  constructor(address skill) 
  {
    _initialized = false;
    _skill = SkillToken(skill);
  }

  function initialize(
    PayeeIds[] memory payeeIds, // for special actions per contract
    address[] memory payees, 
    uint[] memory shares, 
    uint[] memory cycles
  ) public onlyOwner
  {
    require(_initialized == false, 'Already initialized');
    require(
      (payees.length == shares.length) && 
      (shares.length == cycles.length) && 
      (cycles.length == payeeIds.length), 
      'Invalid dimensions'
    );
    require(_arraySum(shares) <= 100, "Invalid percentage");
    _payeeIds = payeeIds;
    _payees = payees;
    _shares = shares;
    _cycles = cycles;
    _initialized = true;
  }

  function _arraySum(uint[] memory array) public pure returns (uint) {
    uint sum = 0;
    for (uint i=0; i<array.length; i++) {
      sum += array[i];
    }
    return sum;
  }

  function transfer() public {
    uint balance = _skill.balanceOf(address(this));

    for (uint i=0; i<_payees.length; i++) {
      address payee = _payees[i];
      if (_payTimes[i] + _cycles[i] * 1 seconds < block.timestamp) {
        uint amount = balance * _shares[i] / 100;
        _skill.transfer(payee, amount);
        _payTimes[i] = block.timestamp;

        if (_payeeIds[i] == PayeeIds.GAME) {
          SnookGame game = SnookGame(_payees[i]);
          uint releaseTime = block.timestamp + _cycles[i] * 1 seconds;
          game.startNewPeriod(amount, releaseTime);
        }
      }
    }
  }
} 