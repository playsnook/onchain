// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "./IDescriptorUser.sol";

interface ISnookGame is IDescriptorUser {
  event GameAllowed(address indexed from, uint tokenId);
  event Entry(address indexed from, uint tokenId);
  event Extraction(address indexed to, uint tokenId);
  event Death(
    address indexed to, 
    uint tokenId, 
    uint killerTokenId, 
    uint remainingLives,
    uint killerChainId
  );
  event Killing(
    address indexed to,
    uint tokenId,
    uint killedTokenId,
    uint killedChainId
  );
  event Birth2(address indexed to, uint tokenId, uint price, uint traitId);
  event PpkClaimed(address indexed to, uint rewardsAmount);
  
  function getBurnSafeAddress() view external returns(address);
  function isBridged() view external returns(bool);
  function getSNOOKAddress() external view returns (address);
  function getSNKAddress() external view returns (address);
  // function getSkinRewardsAddress() external view returns (address);
  function getSnookStateAddress() external view returns (address);
  function getAfterdeathAddress() external view returns (address);
  function getUniswapUSDCSkillAddress() external view returns (address);

  function describe(uint tokenId) external view returns (Descriptor memory d);
  function mint2(uint count) external returns (uint[] memory);
  function enterGame2(uint256 tokenId) external;

  function extractSnooksWithoutUpdate(uint256[] memory tokenIds) external;
  
  function extractSnook(
    uint256 tokenId, 
    uint traitCount, 
    uint stars, 
    uint score, 
    string memory tokenURI_
  ) external;
  
  function reportKill(
      uint256 tokenId, 
      uint traitCount,
      uint stars,
      string memory tokenURI,
      uint killerTokenId,
      bool unlock
  ) external;
  
  function reportKilled(
    uint tokenId,
    uint traitCount,
    uint stars,
    string calldata tokenURI,
    uint killerTokenId,
    bool unlock,
    uint killerChainId // for log only
  ) external;
  
  function reportKiller(
    uint tokenId,
    uint killedTokenId,   // for log only
    uint killedChainId    // for log only
  ) external;

  function getPpkCounter() view external returns(uint);
  function increamentPpkCounter() external;
  function computePpk() view external returns (uint);
  function getKillsAndComputePpkRewards(address account) 
    view external returns (uint kills, uint rewardsAmount);
  function claimPpkRewards() external;
  function getLivesPerSnook() external pure returns(uint);

  function pause() external;
  function unpause() external;
}