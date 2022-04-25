// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/utils/TokenTimelock.sol";

interface IStakingRewards {
  event PeriodStart(
    uint minDepositAmount,
    uint maxDepositAmount,
    uint stakingRewardsBalance,
    uint currentTotalSupply
  );

  event Deposit(
    address beneficiary, 
    address tokenTimelock,
    uint depositAmount, 
    uint rewards, 
    uint rewardsToBurn,
    uint rewardsToPay
  );

  struct DepositRecord {
    TokenTimelock tokenTimelock;
    uint depositAmount;
    uint rewards; 
    // We keep computable values rewardsToBurn and rewardsToPay for convinience: we don't want client
    // to calculate them because we don't want the client to know how to do this, though to 
    // save space we could make client to calculate them.
    uint rewardsToBurn;
    uint rewardsToPay;
  }

  function getSecondsInDay() external view returns (uint);
  function getInitialSNKSupplyInWei() external view returns (uint);
  function getMaxStakingPeriodInDays() external view returns (uint);
  function getMinStakingPeriodInDays() external view returns (uint);
  function getInterestRatePerDayInCentipercents() external view returns (uint);
  function getMinNumberOfStakers() external view returns (uint);
  function getMinStakingValueCoef() external view returns(uint);
  function getPrevInitTime() external view returns (uint);
  function getBurningRateInPercents() external view returns(uint);
  function getSNKAddress() external view returns (address);
  function getTreasuryAddress() external view returns (address);

  function init(uint maxStakingPeriodInDays) external;
  function getDepositLimits() external view returns(uint, uint);
  function deposit(uint amount, uint periodInDays) external; 
  function computeRewards(uint amount, uint periodInDays) external view 
    returns (uint rewards, uint rewardsToBurn, uint rewardsToPay);
  function getDepositRecords(address beneficiary) external view 
    returns (DepositRecord[] memory);
  function burnBalance() external;
  function pause() external;
  function unpause() external;

}