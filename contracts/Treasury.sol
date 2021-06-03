// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";


import './SkillToken.sol';

contract Treasury is Ownable {

  using EnumerableSet for EnumerableSet.AddressSet;
  EnumerableSet.AddressSet private _allocatees;
  mapping (address => uint) private _percentages;
  mapping (address => uint) private _periodicities; // in secs
  mapping (address => uint) private _allocTimes;
  SkillToken private _skill;
  
  constructor(address skill) 
  {
    _skill = SkillToken(skill);
  }

  // remove constructor; add this function and removeAllocatee function; use enumarableSet
  function upsert(address allocatee, uint percentage, uint periodicity) public onlyOwner {
    require(_percentageSum() + percentage <= 100, "Invalid percentage");
    _allocatees.add(allocatee);
    _percentages[allocatee] = percentage;
    _periodicities[allocatee] = periodicity;
  }

  function remove(address allocatee) public onlyOwner {
    require(_allocatees.contains(allocatee), 'No such allocatee');
    _allocatees.remove(allocatee);
    delete _percentages[allocatee];
    delete _periodicities[allocatee];
    delete _allocTimes[allocatee];
  }

  function _percentageSum() public view returns (uint) {
    uint sum = 0;
    for (uint i=0; i<_allocatees.length(); i++) {
      address allocatee = _allocatees.at(i);
      sum += _percentages[allocatee];
    }
    return sum;
  }

  function allocate() public {
    uint balance = _skill.balanceOf(address(this));
    for (uint i=0; i<_allocatees.length(); i++) {
      address allocatee = _allocatees.at(i);
      if (_allocTimes[allocatee] + _periodicities[allocatee] * 1 seconds < block.timestamp) {
        uint amount = balance * _percentages[allocatee] / 100;
        _skill.transfer(allocatee, amount);
        _allocTimes[allocatee] = block.timestamp;
      }
    }
  }
} 