
// Test constract 
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/TokenTimelock.sol";
import './SkillToken.sol';
import './SpecialSkinRewards.sol';
import './SnookFoundationRewards.sol';

import 'hardhat/console.sol';

contract Treasury {
  
  SkillToken private _skillToken;
  address[] private _allocatees;
  uint[] private _percentages;
  uint[] private _periodicities;

  uint[] private _allocTimes;

  constructor(
    address skillToken,
    address[] memory allocatees,
    uint[] memory percentages,
    uint[] memory periodicities
  ) 
  {
    require(allocatees.length == percentages.length && percentages.length == periodicities.length, 'Invalid dimensions');
    require(_arraySum(percentages) <= 100, 'Invalid percentages');
    _skillToken = SkillToken(skillToken);
    _allocatees = allocatees;
    _percentages = percentages;
    _periodicities = periodicities;
  }
  
  function _arraySum(uint[] memory array) public pure returns (uint) {
    uint sum = 0;
    for (uint i=0; i<array.length; i++) {
      sum += array[i];
    }
    return sum;
  }

  function allocate() public {
    uint balance = _skillToken.balanceOf(address(this));
    for (uint i=0; i<_allocatees.length; i++) {
      if (_allocTimes[i] + _periodicities[i] * 1 days < block.timestamp) {
        uint amount = balance * _percentages[i] / 100;
        _skillToken.transfer(address(this), amount);
      }
    }
  }
} 