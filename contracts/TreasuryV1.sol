// https://ethereum.stackexchange.com/questions/62126/time-lock-and-vesting-smart-contract
// https://www.toptal.com/ethereum-smart-contract/time-locked-wallet-truffle-tutorial

// SPDX-License-Identifier: MIT

// Test constract 
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/TokenTimelock.sol";
import './SkillToken.sol';

contract TreasuryV1 {
  SkillToken private _skillToken;
  address[] private _beneficiaries;
  uint[] private _allocationPercentages;
  uint[] private _releasePeriodicities; // days
  uint[] private _previousAllocationTimes;

  constructor(
    address skillToken_,
    address[] memory beneficiaries_,  // currently: Staking, SpecialSkin, SnookFoundation
    uint[] memory allocationPercentages_,
    uint[] memory releasePeriodicities_
  ) 
  {
    require(
      beneficiaries_.length == allocationPercentages_.length && 
      allocationPercentages_.length == releasePeriodicities_.length, 
    'Invalid params');

    _skillToken = SkillToken(skillToken_);
    _beneficiaries = beneficiaries_;
    _allocationPercentages  = allocationPercentages_;
    _releasePeriodicities = releasePeriodicities_;
  }


  function _updateAllocation(
    address beneficiary, 
    uint previousAllocationTime, 
    uint releasePeriodicity, 
    uint allocationPercentage
  ) private returns (uint releaseTime, TokenTimelock tokenTimelock)
  {
    releaseTime = previousAllocationTime;
    tokenTimelock;
    if (previousAllocationTime + releasePeriodicity * 1 days <= block.timestamp) { // time to lock
      releaseTime = block.timestamp + releasePeriodicity * 1 days;
      tokenTimelock = new TokenTimelock(_skillToken, beneficiary, releaseTime);
      uint treasuryBalance = _skillToken.balanceOf(address(this));
      uint allocationAmount = treasuryBalance * allocationPercentage / 100; 
      _skillToken.transferFrom(address(this), address(tokenTimelock), allocationAmount);
    }
  }

  // called  after a fee comes in
  function updateAllocations() public {
    for (uint i = 0; i < _beneficiaries.length; i++) {
      address beneficiary = _beneficiaries[i];
      uint previousAllocationTime = _previousAllocationTimes[i];
      uint releasePeriodicity = _releasePeriodicities[i];
      uint allocationPercentage = _allocationPercentages[i];
      _updateAllocation(beneficiary, previousAllocationTime, releasePeriodicity, allocationPercentage);
    }  
  }

}