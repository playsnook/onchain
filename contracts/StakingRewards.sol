// SPDX-License-Identifier: MIT

// Test constract 
pragma solidity ^0.8.0;
import './SkillToken.sol';
import './SnookToken.sol';
import './SnookGame.sol';
import "@openzeppelin/contracts/token/ERC20/utils/TokenTimelock.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import 'hardhat/console.sol';

// All periods are in seconds; interestRate is on 1 second time basis
contract StakingRewards is Ownable {
  uint private _maxStakingPeriod; // secs; defines staking cycle; Cmax is calculated once per 3 months
  uint private _minStakingPeriod; // secs
  uint private _initialSkillSupply; 
  uint constant NanoPercent = 100 * 10**9;
  uint private _interestRate; // in nano-percents; 1 = 1*10^(-9) %
  
  uint private _minNumberOfStakers;
  uint private _minStakingValueCoef;
  uint private _cmax; // re-calculated every _maxStakingPeriod
  uint private _cmin;
  uint private _prevInitTime;
  uint private _burningRate; // in percents, 1 is 1%
  SkillToken private _skill;
   
  mapping (address => TokenTimelock[]) private _beneficiaryTokenTimelocks;
  event Deposit(address beneficiary, address tokenTimelock);

  constructor(
    address skill, 
    uint minStakingPeriod, // secs
    uint maxStakingPeriod, // secs
    uint minNumberOfStakers,
    uint interestRate, // 1 is equal to 1*10^(-9)%
    uint initialSkillSupply, // in wei
    uint minStakingValueCoef, // factor by which Cmax is devided to get Cmin, Cmin = Cmax / minStatkingValueCoef
    uint burningRate
  ) 
  {
    _skill = SkillToken(skill);
    _minStakingPeriod = minStakingPeriod;
    _maxStakingPeriod = maxStakingPeriod;
    _minNumberOfStakers = minNumberOfStakers;
    _interestRate = interestRate;
    _initialSkillSupply = initialSkillSupply;
    _minStakingValueCoef = minStakingValueCoef;
    _burningRate = burningRate;

  }

  // Equivalent of timelockRewards of SpecialSkinRewards contract.
  // The difference is that SpecialSkinRewards has only a single call that can effect 
  // reward timelocks. Cmax can be computed many times with different output if we don't
  // destrict the call time.
  // Called after treasury allocation.
  function init() public {
    uint tmax = _maxStakingPeriod;
    require(_prevInitTime + tmax * 1 seconds < block.timestamp, 'Previous reward cycle is in progress');
    _prevInitTime = block.timestamp;
    uint T = _skill.balanceOf(address(this));
    uint S = _skill.totalSupply();
    uint S0 = _initialSkillSupply;
    _cmax = S0 * T  * NanoPercent / _interestRate / _minNumberOfStakers / S / tmax;
    if (_cmax > T) { 
      _cmax = T;
    }
    _cmin = _cmax / _minStakingValueCoef; 
  }

  function getDepositLimits() public view returns(uint, uint) {
    return (_cmin, _cmax);
  }

  function _computeRewards(uint amount, uint period) private view returns (uint) {
    uint rewards = amount * period * _skill.totalSupply() * _interestRate / NanoPercent / _initialSkillSupply;
    return rewards;
  }
  

  function deposit(uint amount, uint period) public {
    require(block.timestamp > _prevInitTime && block.timestamp < _prevInitTime + _maxStakingPeriod * 1 seconds, 'Reward cycle is not initialized' );
    require(period >= _minStakingPeriod && period <= _maxStakingPeriod, 'Invalid staking period');
    require(amount >= _cmin && amount <= _cmax, 'Invalid staking amount'); // lets add valid ammounts
        
    uint releaseTime = block.timestamp + period * 1 seconds;
    address beneficiary = msg.sender;
    TokenTimelock tokenTimelock = new TokenTimelock(_skill, beneficiary, releaseTime);
 
    uint rewards = _computeRewards(amount, period);
    uint rewardsToBurn = rewards * _burningRate / 100;
    uint rewardsToPay = rewards - rewardsToBurn;
    
    require(_skill.transferFrom(msg.sender, address(tokenTimelock), amount), 'Not enough funds');
    _skill.burn(address(this), rewardsToBurn);
    _skill.transfer(address(tokenTimelock), rewardsToPay);

    _beneficiaryTokenTimelocks[beneficiary].push(tokenTimelock); 
    emit Deposit(beneficiary, address(tokenTimelock));
  }

  function getTokenTimelock(address beneficiary) public view returns (TokenTimelock[] memory) {
    return _beneficiaryTokenTimelocks[beneficiary];
  }
  
}