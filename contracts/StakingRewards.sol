// SPDX-License-Identifier: MIT

// Test constract 
pragma solidity ^0.8.0;
import './SkillToken.sol';
import './SnookToken.sol';
import './SnookGame.sol';
import "@openzeppelin/contracts/token/ERC20/utils/TokenTimelock.sol";


contract StakingRewards {
  uint private _maxStakingPeriod; // secs; defines staking cycle; Cmax is calculated once per 3 months
  uint private _minStakingPeriod; // secs
  uint private _initialSkillSupply; 
  uint private _dailyInterestRate; // in decimals of a percent, 1 is equal to 0.1 percent
  uint private _minNumberOfStakers;
  uint private _cmax;
  uint private _prevCmaxComputeTime;
  SkillToken private _skill;
  mapping (address => TokenTimelock[]) public beneficiaryTokenTimelocks;

  constructor(
    address skill, 
    uint minStakingPeriod, // secs
    uint maxStakingPeriod, // secs
    uint minNumberOfStakers,
    uint dailyInterestRate, 
    uint initialSkillSupply
  ) 
  {
    _skill = SkillToken(skill);
    _minStakingPeriod = minStakingPeriod;
    _maxStakingPeriod = maxStakingPeriod;
    _minNumberOfStakers = minNumberOfStakers;
    _dailyInterestRate = dailyInterestRate;
    _initialSkillSupply = initialSkillSupply;
  }

  // Equivalent of timelockRewards of SpecialSkinRewards contract.
  // The difference is that SpecialSkinRewards has only a single call that can effect 
  // reward timelocks. Cmax can be computed many times with different output if we don't
  // destrict the call time.
  // Called after treasury allocation.
  function computeCmax() public {
    uint period = _maxStakingPeriod;
    require(_prevCmaxComputeTime + period * 1 seconds < block.timestamp, 'Previous reward cycle is in progress');
    _prevCmaxComputeTime = block.timestamp;
    uint periodInDays = period * 1 seconds / ( 1 days / 1 seconds);
    uint balance = _skill.balanceOf(address(this));
    _cmax = balance * 1000 / periodInDays / _dailyInterestRate / _minNumberOfStakers;
  }

  function _computeRewards(uint amount, uint period) private view returns (uint) {
    // we should have period in days as p = 0.002 is a daily interest rate
    uint periodInDays = period * 1 seconds / ( 1 days / 1 seconds);
    uint rewards = amount * periodInDays * _skill.totalSupply() * _dailyInterestRate / 1000 / _initialSkillSupply;
    return rewards;
  }
  

  function deposit(uint amount, uint period) public {
    require(_skill.approve(address(this), amount), 'Not enough funds to deposit');
    require(period >= _minStakingPeriod && period <= _maxStakingPeriod, 'Invalid staking period');
    
    uint releaseTime = block.timestamp + period * 1 seconds;
    address beneficiary = msg.sender;
    TokenTimelock tokenTimelock = new TokenTimelock(_skill, beneficiary, releaseTime);
    uint rewards = _computeRewards(amount, period);
    _skill.transfer(address(tokenTimelock), rewards);
    beneficiaryTokenTimelocks[beneficiary].push(tokenTimelock); 
  }

  function getTokenTimelock(address beneficiary) public view returns (TokenTimelock[] memory) {
    return beneficiaryTokenTimelocks[beneficiary];
  }
  
}