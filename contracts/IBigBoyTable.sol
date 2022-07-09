// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IBigBoyTable {
  event FreeRoomCreated(uint roomId, address roomOwner);
  event JoinedFreeRoom(uint roomId, address participant);
  event RoomCreated(uint roomId, address roomOwner);
  event RoomFinished(uint roomId, address payable[] winners, address payable[] unseenParticipants);
  event AgedActiveRoomDeleted(uint roomId);
  event RoomLocked(uint roomId);
  event StakeAdded(uint roomId, address participant);
  event EmergencyUnstake(uint roomId);
  enum ROOM_MODE { SINGLE, DEATHMATCH, TEAM }

  struct Room {
    uint id;
    uint participantCount;
    address payable[] participants;
    uint requiredStakeAmount;
    bool isStakeInNativeCurrency;
    address payable owner;
    ROOM_MODE roomMode;
    uint rounds; 
    bool canJoinForFree;
    uint createdAt;
    uint lockedAt;
    uint totalStake;
    string pwdRef;
    bytes32 collectionId;
  }
  
  function getMinParticipantsPerRoom() external pure returns(uint);
  function getMaxParticipantsPerRoom() external pure returns(uint);
  
  function createFreeRoom(
    uint maxParticipantCount,
    uint totalStake,
    bool isStakeInNativeCurrency,
    ROOM_MODE roomMode,
    string calldata pwdRef,
    bytes32 collectionId,
    uint rounds
  ) payable external;

  function createRoom(
    uint maxParticipantCount,
    uint requiredStakeAmount,
    bool isStakeInNativeCurrency,
    ROOM_MODE roomMode,
    string calldata pwdRef,
    bytes32 collectionId,
    uint rounds
  ) external;
  
  function joinFreeRoom(uint roomId) external;
  function stakeSNK(uint roomId) external;
  function stakeNative(uint roomId) payable external;
  function lockRoom(uint roomId) external;
  function reportWinners(
    uint roomId, 
    address payable[] memory winners,
    address payable[] memory players
  ) external;
  function deleteAgedActiveRoom(uint roomId) external;
  function emergencyUnstake(uint roomId) external;

  function getRoom(uint roomId) external view returns(Room memory);
  function getActiveRoomCount() external view returns(uint);
  function getFinishedRoomCount() external view returns(uint);
  function getActiveRooms(uint, uint) external view returns (Room[] memory);
  function getFinishedRooms(uint, uint) external view returns(Room[] memory);
  
  function getRoomCreationPriceInSNK() external view returns (uint);
  function getRoomCreationPriceInUSDC() external view returns (uint);
  function setRoomCreationPriceInUSDC(uint) external;

  // we have no oracle for native gas cost in usdc so we set manually
  function getNative2USDCRatioInEtherUnits() external view returns(uint, uint);
  function setNative2USDCRatioInEtherUnits(uint, uint) external;

  function getMinimalStakeInNative() external view returns(uint);
  function getMinimalStakeInSNK() external view returns(uint);
  function getMinimalStakeInUSDC() external view returns(uint);
  function setMinimalStakeInUSDC(uint) external;

  function getLockingWindowInSeconds() external view returns(uint);
  function setLockingWindowInSeconds(uint) external;

  function getStakingWindowInSeconds() external view returns(uint);
  function setStakingWindowInSeconds(uint) external;

  function getWinningFeeInPercents() external view returns(uint);
  function setWinningFeeInPercents(uint) external;

  function getActiveRoomDeletionDelayInSeconds() external view returns(uint);
  function setActiveRoomDeletionDelayInSeconds(uint) external;

  function getMaxRounds() external pure returns(uint);
  function getExtractorRole() external view returns(bytes32);
  function getPauserRole() external pure returns(bytes32);
  function getEmergencyExtractorRole() external view returns(bytes32);

  function getFoundersAddress() external view returns(address payable);
  function setFoundersAddress(address payable) external;

}