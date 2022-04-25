// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAfterdeath {
  event Resurrection(address indexed from, uint tokenId);
  event Bury(uint startIdx, uint endIdx);

  function getUniswapUSDCSkillAddress() external view returns (address);
  function getSnookStateAddress() external view returns (address);
  function getSNOOKAddress() external view returns (address);
  function getSNKAddress() external view returns (address);
  //function getSkinRewardsAddress() external view returns (address);
  function getBurialDelayInSeconds() external view  returns(uint);
  function getTreasuryAddress() external view returns (address);
  function getSnookGameAddress() external view returns (address);
  //function getSGEAddress() external view returns (address);
  function getTraitHist() external view returns (uint64[] memory);  
  function getAliveSnookCount() external view returns (uint);

  function updateOnMint(uint traitCount, uint count) external;
  function updateOnExtraction(uint onGameEntryTraitCount, uint traitCount) external;
  function updateOnDeath(uint traitCount) external;
  function resurrect(uint256 tokenId) external;
  function getResurrectionPrice(uint256 tokenId) external view returns (uint256 price);

  function toMorgue(uint tokenId) external;
  function bury(uint requestedBurials) external;
  
  function getMorgue(uint startIdx, uint endIdx) external view returns(uint[] memory);
  function getRemovedFromMorgue(uint startIdx, uint endIdx) external view  returns(uint[] memory);
  function getMorgueLength() external view returns (uint);
  function getRemovedFromMorgueLength() external view returns (uint);
  
}