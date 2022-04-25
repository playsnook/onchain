// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBurnSafe {
  event Swapout(uint);
  function pause() external;
  function unpause() external;
  function getPolygonStakingRewardsAddress() view external returns(address);
  function getBalance() external view returns(uint);
  function getMaximumSwapAmount() view external returns(uint);
  function getMinimumSwapAmount() view external returns(uint);
  function getMaximumSwapFeeAmount() view external returns(uint);
  function getMinimumSwapFeeAmount() view external returns(uint);
  function setMaximumSwapAmount(uint maximumSwapAmount) external;
  function setMinimumSwapAmount(uint minimumSwapAmount) external;
  function setMinimumSwapFeeAmount(uint minimumSwapFeeAmount) external;
  function setMaximumSwapFeeAmount(uint maximumSwapFeeAmount) external;
  function swapoutBalance() external;
}