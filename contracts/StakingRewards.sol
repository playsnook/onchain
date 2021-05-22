// SPDX-License-Identifier: MIT

// Test constract 
pragma solidity ^0.8.0;
import './SkillToken.sol';
import './SnookToken.sol';
import './SnookGame.sol';
import "@openzeppelin/contracts/token/ERC20/utils/TokenTimelock.sol";
import 'hardhat/console.sol';

contract StakingRewards {
  uint private _maxStakingPeriod; // secs; defines staking cycle; Cmax is calculated once per 3 months
  uint private _minStakingPeriod; // secs
  uint private _initialSkillSupply; 
  uint private _dailyInterestRate; // in decimals of a percent, 1 is equal to 0.1 percent
  uint private _minNumberOfStakers;
  uint private _minStakingValueCoef;
  uint private _cmax; // re-calculated every _maxStakingPeriod
  uint private _cmin;
  uint private _prevInitTime;
  SkillToken private _skill;
  mapping (address => TokenTimelock[]) public beneficiaryTokenTimelocks;

  constructor(
    address skill, 
    uint minStakingPeriod, // secs
    uint maxStakingPeriod, // secs
    uint minNumberOfStakers,
    uint dailyInterestRate, // in decimals of a percent, 1 is equal to 0.1 percent
    uint initialSkillSupply,
    uint minStakingValueCoef // factor by which Cmax is devided to get Cmin, Cmin = Cmax / minStatkingValueCoef
  ) 
  {
    _skill = SkillToken(skill);
    _minStakingPeriod = minStakingPeriod;
    _maxStakingPeriod = maxStakingPeriod;
    _minNumberOfStakers = minNumberOfStakers;
    _dailyInterestRate = dailyInterestRate;
    _initialSkillSupply = initialSkillSupply;
    _minStakingValueCoef = minStakingValueCoef;
  }

  // Equivalent of timelockRewards of SpecialSkinRewards contract.
  // The difference is that SpecialSkinRewards has only a single call that can effect 
  // reward timelocks. Cmax can be computed many times with different output if we don't
  // destrict the call time.
  // Called after treasury allocation.
  function init() public {
    uint period = _maxStakingPeriod;
    require(_prevInitTime + period * 1 seconds < block.timestamp, 'Previous reward cycle is in progress');
    _prevInitTime = block.timestamp;
    uint periodInDays = period * 1 seconds / ( 1 days / 1 seconds);
    //  !!!! DEBUG ONLY: remove after testing
    periodInDays = period;
    // !!!! /DEBUG ONLY
    uint balance = _skill.balanceOf(address(this));
    _cmax = balance * 1000 / periodInDays / _dailyInterestRate / _minNumberOfStakers;
    _cmin = _cmax / _minStakingValueCoef; 
  }

  function getDepositLimits() public view returns(uint, uint) {
    return (_cmin, _cmax);
  }

  function _computeRewards(uint amount, uint period) private view returns (uint) {
    // we should have period in days as p = 0.002 is a daily interest rate
    uint periodInDays = period * 1 seconds / ( 1 days / 1 seconds);
    uint rewards = amount * periodInDays * _skill.totalSupply() * _dailyInterestRate / 1000 / _initialSkillSupply;
    return rewards;
  }
  

  function deposit(uint amount, uint period) public {
    
    require(block.timestamp > _prevInitTime && block.timestamp < _prevInitTime + _maxStakingPeriod * 1 seconds, 'Reward cycle is not initialized' );
    require(period >= _minStakingPeriod && period <= _maxStakingPeriod, 'Invalid staking period');
    require(_skill.approve(address(this), amount), 'Not enough funds to deposit');
    
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