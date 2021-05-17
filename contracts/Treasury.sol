
// Test constract 
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/TokenTimelock.sol";
import './SkillToken.sol';
import './SpecialSkinRewards.sol';
import './SnookFoundationRewards.sol';

import 'hardhat/console.sol';

contract Treasury {
  uint constant SpecialSkinRewardsAllocationCycle = 30;
  uint constant SpecialSkinRewardsAllocationPercentage = 10;
  
  SkillToken private _skillToken;
  SpecialSkinRewards private _specialSkinRewards;
  SnookFoundationRewards private _snookFoundationRewards;
  uint _snookFoundationRewardsAllocationCycle;
  uint _snookFoundationRewardsAllocationPercentage;
  uint private _prevSSR;
  uint private _prevSFR;

  constructor(
    address skillToken, 
    address specialSkinRewards,
    address snookFoundationRewards,
    uint snookFoundationRewardsAllocationCycle,
    uint snookFoundationRewardsAllocationPercentage
  ) 
  {
    _skillToken = SkillToken(skillToken);
    _specialSkinRewards = SpecialSkinRewards(specialSkinRewards);
    _snookFoundationRewards = SnookFoundationRewards(snookFoundationRewards);
    _snookFoundationRewardsAllocationCycle = snookFoundationRewardsAllocationCycle;
    _snookFoundationRewardsAllocationPercentage = snookFoundationRewardsAllocationPercentage;

    _prevSFR = 0;
    _prevSSR = 0;
  } 


  // called by anyone; we cannot steal the rewards if we did not run cronjob:
  // some user will do this
  function allocate() public {
    uint balance = _skillToken.balanceOf(address(this));
    uint amountSSR = balance * SpecialSkinRewardsAllocationPercentage / 100;
    uint amountSFR = balance * _snookFoundationRewardsAllocationPercentage / 100;
    console.log('allocate with balance: ', balance);
    if (_prevSFR + _snookFoundationRewardsAllocationCycle * 1 days < block.timestamp) {
      console.log('running snookFoundation contract');
      _skillToken.transfer(address(_snookFoundationRewards), amountSFR);
      uint releaseTime = block.timestamp + _snookFoundationRewardsAllocationCycle * 1 days;
      _snookFoundationRewards.timelockRewards(amountSFR, releaseTime);
      _prevSSR = block.timestamp;
    }
  }

  

  
} 