// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ICollectionList {
  struct Collection {
    bytes32 id;
    string name;
    uint chainId;
    address token;
    uint accessThresholdInCollectionTokens;
    uint activityThresholdInSNK;
    uint lockPeriodInSeconds;
    uint revshareInPercents;
    address payable revshareRecipient;    
    uint depositedSNK;
    bool active;
    uint lockedAt;
    bool depositsEnabled;
  }

  event CollectionAdded(bytes32 collectionId);
  event SNKDeposited(bytes32 collectionId, address depositor, uint amount, bool newStatus);
  event SNKWithdrawn(bytes32 collectionId, address depositor, uint amount, bool newStatus);
  event DepositsReleased(bytes32 collectionId, uint releasedCount, uint remainingCount);
  event CollectionRemoved(bytes32 collectionId);

  function addCollection(
    string calldata name,
    uint chainId,
    address token,
    uint accessThresholdInCollectionTokens,
    uint activityThresholdInSNK,
    uint lockPeriodInSeconds,
    uint revshareInPercents,
    address payable revshareRecipient
  ) external;

  function removeCollection(bytes32 collectionId) external;
  function setLock(bytes32 collectionId) external;
  function setName(bytes32 collectionId, string memory name) external;
  function setChainId(bytes32 collectionId, uint chainId) external;
  function setToken(bytes32 collectionId, address token) external;
  function setAccessThresholdInCollectionTokens(bytes32 collectionId, uint accessThresholdInColectionTokens) external;
  function setActivityThresholdInSNK(bytes32 collectionId, uint activityThresholdInSNK) external;
  function setRevshareRecipient(bytes32 collectionId, address payable revshareRecipient) external;
  function setRevshareInPercents(bytes32 collectionId, uint revshareInPercents) external;
  function setLockPeriodInSeconds(bytes32 collectionId, uint lockPeriodInSeconds) external;
  function depositSNK(bytes32 collectionId, uint amount) external;
  function withdrawSNK(bytes32 collectionId) external;
  function getCollectionCount() external view returns (uint);
  function getCollections(uint startIdx, uint endIdx) 
    external view returns(Collection[] memory);
  function getCollection(bytes32 collectionId) 
    external view returns(Collection memory);
  function getPauserRole() external pure returns(bytes32);
  function isActive(bytes32 collectionId) external view returns(bool);
  function getRevshareRecipient(bytes32 collectionId) external view returns(address payable);
  function getRevshareInPercents(bytes32 collectionId) external view returns(uint);
  function releaseDeposits(bytes32 collectionId, uint count) external;
  function getDepositRecordCount(bytes32 collectionId) view external returns(uint);
  function toggleDepositAccepting(bytes32 collectionId) external; 
  
}
