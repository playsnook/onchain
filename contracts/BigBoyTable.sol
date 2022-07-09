// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";


import "./IBigBoyTable.sol";
import "./ISkillToken.sol";
import "./IUniswapUSDCSkill.sol";
import "./ICollectionList.sol";

import "hardhat/console.sol";

contract BigBoyTable is IBigBoyTable, AccessControlEnumerableUpgradeable, PausableUpgradeable {
  using EnumerableSet for EnumerableSet.UintSet;

  struct InitializerParameters {
    address adminAccount;
    uint winningFeeInPercents;
    uint roomCreationPriceInUSDC;
    uint lockingWindowInSeconds;
    uint stakingWindowInSeconds;
    uint activeRoomDeletionDelayInSeconds;
    uint minimalStakeInUSDC;
    uint native2usdcNumerator;
    uint native2usdcDenominator;
    address payable foundersAddress;
    address skill;
    address ecosystem;
    address uniswap;
    address collectionList;
  }

  using Counters for Counters.Counter;
  bytes32 private constant EXTRACTOR_ROLE = keccak256("EXTRACTOR_ROLE");
  bytes32 private constant EMERGENCY_EXTRACTOR_ROLE = keccak256("EMERGENCY_EXTRACTOR_ROLE");
  bytes32 private constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
  bytes32 private constant NONEXISTENT_COLLECTION_ID = 0x0;
  uint private constant MIN_PARTICIPANTS_PER_ROOM = 2;
  uint private constant MAX_PARTICIPANTS_PER_ROOM = 100;
  uint private constant _nativeCurrencyDecimals = 18; // ethereum-compatible networks
  uint private constant _usdcDecimals = 6;
  uint private constant _skillDecimals = 18;
  uint private constant MAX_ROUNDS = 24;

  Counters.Counter private _roomIds;
  
  address payable private _foundersAddress;
  ISkillToken private _skill;
  ICollectionList private _collectionList;
  address private _ecosystem;
  IUniswapUSDCSkill private _uniswap;
  // percent of SNK or Native, depending on room currency
  uint private _winningFeeInPercents;
  uint private _roomCreationPriceInUSDC;
  uint private _stakingWindowInSeconds;
  uint private _activeRoomDeletionDelayInSeconds;
  uint private _minimalStakeInUSDC;
  uint private _native2usdcNumerator;
  uint private _native2usdcDenominator;

  mapping(uint=>Room) private _rooms;
  EnumerableSet.UintSet private _activeRoomIds;
  EnumerableSet.UintSet private _finishedRoomIds;
  uint private _lockingWindowInSeconds;

  modifier onlyActiveRoom(uint roomId) {
    require(_activeRoomIds.contains(roomId), 'BBT: room is not active');
    _;
  }

  modifier whenStakePossible(uint roomId) {
    require(_activeRoomIds.contains(roomId), 'BBT: room is not active');
    require(
      _rooms[roomId].lockedAt > 0, 'BBT: room is not locked'
    );
    require(
      block.timestamp <= _rooms[roomId].lockedAt + _stakingWindowInSeconds,
      'BBT: staking window closed'
    );
    require(
      _rooms[roomId].participantCount < _rooms[roomId].participants.length,
      'BBT: no more participants possible'
    );
    _;
  }

  function getMaxRounds() external override pure returns(uint) {
    return MAX_ROUNDS;
  }

  function getExtractorRole() external override pure returns(bytes32) {
    return EXTRACTOR_ROLE;
  }

  function getEmergencyExtractorRole() external override pure returns(bytes32) {
    return EMERGENCY_EXTRACTOR_ROLE;
  }

  function getPauserRole() external override pure returns(bytes32) {
    return PAUSER_ROLE;
  }


  function initialize(InitializerParameters calldata params) initializer public {
    __AccessControlEnumerable_init();
    __Pausable_init();
    
    _setupRole(DEFAULT_ADMIN_ROLE, params.adminAccount);
    _setupRole(EXTRACTOR_ROLE, params.adminAccount);

    _foundersAddress = params.foundersAddress;
    _skill = ISkillToken(params.skill);
    _ecosystem = params.ecosystem;
    _uniswap = IUniswapUSDCSkill(params.uniswap);
    _collectionList = ICollectionList(params.collectionList);
    _winningFeeInPercents = params.winningFeeInPercents;
    _roomCreationPriceInUSDC = params.roomCreationPriceInUSDC;
    _lockingWindowInSeconds = params.lockingWindowInSeconds;
    _stakingWindowInSeconds = params.stakingWindowInSeconds;
    _activeRoomDeletionDelayInSeconds = params.activeRoomDeletionDelayInSeconds;
    _minimalStakeInUSDC = params.minimalStakeInUSDC;
    _native2usdcNumerator = params.native2usdcNumerator;
    _native2usdcDenominator = params.native2usdcDenominator;
    
  }

  function getMaxParticipantsPerRoom() external override pure returns(uint) {
    return MAX_PARTICIPANTS_PER_ROOM;
  }

  function getMinParticipantsPerRoom() external override pure returns(uint) {
    return MIN_PARTICIPANTS_PER_ROOM;
  }

  function getActiveRoomDeletionDelayInSeconds() external override view returns(uint) {
    return _activeRoomDeletionDelayInSeconds;
  }

  function setActiveRoomDeletionDelayInSeconds(uint activeRoomDeletionDelayInSeconds) 
    external override onlyRole(PAUSER_ROLE) 
  {
    _activeRoomDeletionDelayInSeconds = activeRoomDeletionDelayInSeconds;
  }

  function getWinningFeeInPercents() external override view returns(uint) {
    return _winningFeeInPercents;
  }

  function setWinningFeeInPercents(uint winningFeeInPercents) 
    external override onlyRole(PAUSER_ROLE) 
  {
    _winningFeeInPercents = winningFeeInPercents;
  }  

  function getLockingWindowInSeconds() external override view returns(uint) {
    return _lockingWindowInSeconds;
  }

  function setLockingWindowInSeconds(uint lockingWindowInSeconds) 
    external override onlyRole(PAUSER_ROLE) 
  {
    _lockingWindowInSeconds = lockingWindowInSeconds;
  } 

  function getStakingWindowInSeconds() external override view returns(uint) {
    return _stakingWindowInSeconds;
  }

  function setStakingWindowInSeconds(uint stakingWindowInSeconds) 
    external override onlyRole(PAUSER_ROLE) 
  {
    _stakingWindowInSeconds = stakingWindowInSeconds;
  } 

  function getRoomCreationPriceInUSDC() external override view returns(uint) {
    return _roomCreationPriceInUSDC;
  }

  function setRoomCreationPriceInUSDC(uint roomCreationPriceInUSDC) 
    external override onlyRole(PAUSER_ROLE) 
  {
    _roomCreationPriceInUSDC = roomCreationPriceInUSDC;
  }

  function getMinimalStakeInUSDC() external override view returns(uint) {
    return _minimalStakeInUSDC;
  }

  function setMinimalStakeInUSDC(uint minimalStakeInUSDC) 
    external override onlyRole(PAUSER_ROLE)
  {
    _minimalStakeInUSDC = minimalStakeInUSDC; 
  }

  function _getMinimalStakeInSNK() internal view returns(uint) {
    return _convertUSDC2Skill(_minimalStakeInUSDC);
  }

  function getMinimalStakeInSNK() external override view returns(uint) {
    return _getMinimalStakeInSNK();
  }

  function _getMinimalStakeInNative() internal view returns(uint) {
    return _convertUSDC2Native(_minimalStakeInUSDC);
  }

  function getMinimalStakeInNative() external override view returns(uint) {
    return _getMinimalStakeInNative();
  }

  function _convertUSDC2Skill(uint usdc) internal view returns(uint skill) {
    // NOTE: priceInSNK = priceInUSDC * k / 0.25
    uint k = _uniswap.getSnookPriceInSkills();
    skill = usdc * k * (100 / 25) / (10**_usdcDecimals);
  }

  function _convertUSDC2Native(uint usdc) internal view returns(uint native) {
    // numerator and denominator are for ETHER units of each token
    native = usdc * _native2usdcNumerator / _native2usdcDenominator * 10**_nativeCurrencyDecimals / 10**_usdcDecimals;
  }

  function getNative2USDCRatioInEtherUnits() external override view returns(uint, uint) {
    return (_native2usdcNumerator, _native2usdcDenominator);
  }

  function setNative2USDCRatioInEtherUnits(uint numerator, uint denominator) 
    external override onlyRole(PAUSER_ROLE)
  {
    _native2usdcNumerator = numerator;
    _native2usdcDenominator = denominator;
  }

  function _getRoomCreationPriceInSkill() internal view returns(uint) {
    return _convertUSDC2Skill(_roomCreationPriceInUSDC);
  }

  function getRoomCreationPriceInSNK() external override view returns (uint) {
    return _getRoomCreationPriceInSkill();
  }

  function _createRoom(
    uint maxParticipantCount,
    uint requiredStakeAmount,
    bool isStakeInNativeCurrency,
    ROOM_MODE roomMode,
    string calldata pwdRef,
    bytes32 collectionId,
    uint rounds
  ) internal returns(uint) {
    require(
      roomMode == ROOM_MODE.SINGLE || roomMode == ROOM_MODE.DEATHMATCH, 
      "BBT: unsupported mode"
    );
    require(
      rounds > 0 && rounds <= MAX_ROUNDS,
      "BBT: invalid rounds"
    );
    require(
      maxParticipantCount >= 2 && 
      maxParticipantCount <= MAX_PARTICIPANTS_PER_ROOM, 
      "BBT: invalid max number of participants"
    );

    require(
      isStakeInNativeCurrency == false && requiredStakeAmount >= _getMinimalStakeInSNK() ||
      isStakeInNativeCurrency == true && requiredStakeAmount >= _getMinimalStakeInNative(),
      "BBT: requiredStake is less than minimal"
    );
    ///@dev Creation fee is taken ONLY in SNK
    require(
      _skill.transferFrom(msg.sender, _ecosystem, _getRoomCreationPriceInSkill()),
      'BBT: Not enough SNK for room creation'
    );
    
    _roomIds.increment();
    uint roomId = _roomIds.current();
   _rooms[roomId] = Room({
      id: roomId,
      participantCount: 0,
      participants: new address payable[](maxParticipantCount),
      requiredStakeAmount: requiredStakeAmount,
      isStakeInNativeCurrency: isStakeInNativeCurrency,
      owner: payable(msg.sender),
      roomMode: roomMode,
      rounds: rounds,
      canJoinForFree: false,
      createdAt: block.timestamp,
      lockedAt: 0,
      totalStake: 0,
      pwdRef: pwdRef,
      collectionId: collectionId
    });
    _activeRoomIds.add(roomId);
    return roomId;
  }
  
  function createFreeRoom(
    uint maxParticipantCount,
    uint totalStake,
    bool isStakeInNativeCurrency,
    ROOM_MODE roomMode,
    string calldata pwdRef,
    bytes32 collectionId,
    uint rounds
  ) payable external override {
    require(
      isStakeInNativeCurrency == false && _skill.transferFrom(msg.sender, address(this), totalStake) ||
      isStakeInNativeCurrency == true && msg.value == totalStake,
      'BBT: not enough funds for stake'
    );
    uint roomId = _createRoom(
      maxParticipantCount,
      totalStake,
      isStakeInNativeCurrency,
      roomMode,
      pwdRef,
      collectionId,
      rounds
    );
    Room storage room = _rooms[roomId]; 
    room.totalStake = totalStake; 
    room.canJoinForFree = true;
    emit FreeRoomCreated(roomId, msg.sender);
  }

  function createRoom(
    uint maxParticipantCount,
    uint requiredStakeAmount,
    bool isStakeInNativeCurrency,
    ROOM_MODE roomMode,
    string calldata pwdRef,
    bytes32 collectionId,
    uint rounds
  ) external override
  {
    uint roomId = _createRoom(
      maxParticipantCount, 
      requiredStakeAmount, 
      isStakeInNativeCurrency, 
      roomMode,
      pwdRef,
      collectionId,
      rounds
    );
    emit RoomCreated(roomId, msg.sender); 
  }

  /// @dev After room locking, the stakes are possible during staking window.
  function lockRoom(uint roomId) external override onlyActiveRoom(roomId) {
    Room storage room = _rooms[roomId];
    require(msg.sender == room.owner, 'BBT: not a room owner');
    require(room.lockedAt == 0, 'BBT: room already locked');
    require(block.timestamp <= room.createdAt + _lockingWindowInSeconds, 'BBT: locking window is closed');
    room.lockedAt = block.timestamp;
    emit RoomLocked(roomId);
  } 

  function joinFreeRoom(uint roomId) whenStakePossible(roomId)
    external override 
  {
    Room storage room = _rooms[roomId];
    require(room.canJoinForFree == true, 'BBT: room is not free');
    room.participants[room.participantCount] = payable(msg.sender);
    room.participantCount += 1;
    emit JoinedFreeRoom(roomId, msg.sender); 
  }

  function stakeSNK(uint roomId) 
    external override whenStakePossible(roomId) 
  {
    Room storage room = _rooms[roomId];
    require(
      room.isStakeInNativeCurrency == false,
      'BBT: stakes should be in native currency'
    );
    require(
      _skill.transferFrom(msg.sender, address(this), room.requiredStakeAmount),
      'BBT: not enough SNK for stake'
    );
    
    room.participants[room.participantCount] = payable(msg.sender);
    room.participantCount += 1;
    room.totalStake += room.requiredStakeAmount;
    emit StakeAdded(roomId, msg.sender);
  }

  function stakeNative(uint roomId) 
    payable external override whenStakePossible(roomId)
  {
    Room storage room = _rooms[roomId];
    require(
      room.isStakeInNativeCurrency == true,
      'BBT: stakes should be in SNK'
    );
    require(
      msg.value == room.requiredStakeAmount,
      'BBT: not enough native currency for stake'
    );
    room.participants[room.participantCount] = payable(msg.sender);
    room.participantCount += 1;
    room.totalStake += room.requiredStakeAmount;
    emit StakeAdded(roomId, msg.sender);
  } 


  function _areParticipants(Room memory room, address payable[] memory winners) 
    internal pure returns(bool) 
  {
    for (uint i=0; i<winners.length; i++) {
      bool found = false;
      for (uint j=0; j<room.participantCount; j++) {
        if (winners[i] == room.participants[j]) {
          found = true;
          break;
        }
      }
      if (found == false) {
        return false;
      }
    }
    return true;
  }
  
  function _arrayDifference(
    address payable[] memory arr1, 
    address payable[] memory arr2
  ) internal pure returns(address payable[] memory) 
  {
    address payable[] memory a1 = arr1;
    address payable[] memory a2 = arr2;
    if (arr1.length < arr2.length) {
      a2 = arr1;
      a1 = arr2;
    }
    uint maxlen = a1.length + a2.length;
    address payable[] memory d = new address payable[](maxlen);
    uint k = 0;
    for (uint i=0; i<a1.length; i++) {
      bool found = false;
      for (uint j=0; j<a2.length; j++) {
        if (a1[i] == a2[j]) {
          found = true;
          break;
        }
      }
      if (found == false) {
        d[k++] = a1[i];
      }
    }
    address payable[] memory result = new address payable[](k);
    for (uint i=0; i<k; i++) {
      result[i] = d[i];
    }
    return result;
  }

  /**
    @dev
    Not all participants may successfully join the game (the server may not see an event of the stake from one of them).
    So we return the stake to participants who staked but not played. 
   */
  function reportWinners(
    uint roomId, 
    address payable[] memory winners,
    address payable[] memory players  
  ) onlyActiveRoom(roomId) onlyRole(EXTRACTOR_ROLE) external override  
  {
    Room memory room = _rooms[roomId];
    require(room.lockedAt > 0, "BBT: cannot report winners before room is locked");
    require(
      block.timestamp > room.lockedAt + _stakingWindowInSeconds,
      "BBT: cannot report winners before staking window is closed"
    );

    require(
      players.length >= MIN_PARTICIPANTS_PER_ROOM && // condition for GS to start the game
      players.length <= room.participantCount,
      "BBT: invalid number of players"
    );

    require(
      winners.length >= 1 && 
      winners.length <= players.length, 
      "BBT: invalid number of winners"
    );
    
    require(
      _areParticipants(room, winners) == true, 
      'BBT: one or more of reported winners are not participant'
    );

    require(
      _areParticipants(room, players) == true, 
      'BBT: one or more of reported players are not participant'
    );

    // For free rooms, we return stakes to the participants who were not seen by GS.
    uint returnedStake = 0;
    address payable[] memory unseenParticipants;
    if (
      _rooms[roomId].canJoinForFree == false && 
      players.length < room.participantCount
    ) 
    { 
      unseenParticipants = _arrayDifference(players, room.participants);
      returnedStake = room.requiredStakeAmount * unseenParticipants.length;
      room.totalStake -= returnedStake;
      for (uint i=0; i<unseenParticipants.length; i++) {
        if (room.isStakeInNativeCurrency == false) {
          _skill.transfer(unseenParticipants[i], room.requiredStakeAmount);
        } else {
          unseenParticipants[i].transfer(room.requiredStakeAmount);
        }
      }
    }

    uint winningFeeAmount = room.totalStake * _winningFeeInPercents / 100;
    uint revshareAmount = 0;
    uint revshareInPercents = 0;
    address payable revshareRecipient;
    if (room.collectionId != NONEXISTENT_COLLECTION_ID) {
      revshareInPercents = _collectionList.getRevshareInPercents(room.collectionId);
      revshareRecipient = _collectionList.getRevshareRecipient(room.collectionId);
      revshareAmount = room.totalStake * revshareInPercents / 100;
    }
    uint prizeAmount = (room.totalStake - winningFeeAmount - revshareAmount)/winners.length;

    /// @dev Send winning fee to Foundation.
    if (room.isStakeInNativeCurrency == false) {
      _skill.transfer(_foundersAddress, winningFeeAmount);
    } else {
      (bool sent,) = _foundersAddress.call{value: winningFeeAmount}("");
      require(sent, "BBT: winning fee was not sent to founders");
    }

    /// @dev Send revshare if collection exists and active and revshareAmount > 0 
    if (
      revshareAmount > 0 &&
      room.collectionId != NONEXISTENT_COLLECTION_ID && 
      _collectionList.isActive(room.collectionId)
    ) 
    {
      if (room.isStakeInNativeCurrency == false) {
        _skill.transfer(revshareRecipient, revshareAmount);
      } else {
        (bool sent,) = revshareRecipient.call{value: revshareAmount}("");
        require(sent, "BBT: revshare was not sent to recipient");
      }
    }

    /// @dev Send prize to the winners.
    for (uint i=0; i<winners.length; i++) {
      if (room.isStakeInNativeCurrency == false) {
        _skill.transfer(winners[i], prizeAmount);
      } else {
        winners[i].transfer(prizeAmount);
      }
    }

    _activeRoomIds.remove(roomId);
    _finishedRoomIds.add(roomId);
    emit RoomFinished(roomId, winners, unseenParticipants);
  }

  function getRoom(uint roomId) external override view returns(Room memory) {
    require(
      _activeRoomIds.contains(roomId) || _finishedRoomIds.contains(roomId), 
      "BBT: invalid room id"
    );
    return _rooms[roomId];
  }

  function getActiveRoomCount() external override view returns(uint) {
    return _activeRoomIds.length();
  }

  function getFinishedRoomCount() external override view returns(uint) {
    return _finishedRoomIds.length();
  }

  function getActiveRooms(uint startIdx, uint endIdx) external override view 
    returns(Room[] memory)
  {
    require(
      startIdx < endIdx && endIdx <= _activeRoomIds.length(), 
      "BBT: invalid indexes"
    );
    Room[] memory slice = new Room[](endIdx-startIdx);
    for (uint i=startIdx; i<endIdx; i++) {
      slice[i-startIdx] = _rooms[_activeRoomIds.at(i)];
    } 
    return slice;
  }

  function getFinishedRooms(uint startIdx, uint endIdx) external override view 
    returns(Room[] memory)
  {
    require(
      startIdx < endIdx && endIdx <= _finishedRoomIds.length(), 
      "BBT: invalid indexes"
    );
    Room[] memory slice = new Room[](endIdx-startIdx);
    for (uint i=startIdx; i<endIdx; i++) {
      slice[i-startIdx] = _rooms[_finishedRoomIds.at(i)];
    } 
    return slice;
  }

  function deleteAgedActiveRoom(uint roomId) external override onlyActiveRoom(roomId) {
    require(
      block.timestamp > _rooms[roomId].createdAt + _activeRoomDeletionDelayInSeconds,
      "BBT: room is not aged enough"
    );
    Room storage room = _rooms[roomId];
    if (room.canJoinForFree == true) { // free room, return stake to the room creator
      if (room.isStakeInNativeCurrency == true) {
        room.owner.transfer(room.totalStake);
      } else {
        _skill.transfer(room.owner, room.totalStake);
      }
    } else { // non-free room, return stakes to all participants (stakers)
      if (room.isStakeInNativeCurrency == true) {
        for (uint i=0; i<room.participantCount; i++) {
          room.participants[i].transfer(room.requiredStakeAmount);
        }
      } else {
        for (uint i=0; i<room.participantCount; i++) {
          _skill.transfer(room.participants[i], room.requiredStakeAmount);
        }
      }
    }

    _activeRoomIds.remove(roomId);
    emit AgedActiveRoomDeleted(roomId);
  }

  function emergencyUnstake(uint roomId) 
    onlyActiveRoom(roomId) onlyRole(EMERGENCY_EXTRACTOR_ROLE) external override
  {
    Room storage room = _rooms[roomId];
    if (room.isStakeInNativeCurrency == false) {
      if (room.canJoinForFree == false) { // non free room, participants made stakes
        /// @dev Loop gas limit is prevents as during creation participantCount is limited.
        for (uint i=0; i<room.participantCount; i++) {
          _skill.transfer(room.participants[i], room.requiredStakeAmount);
        }
      } 
    } else {
      if (room.canJoinForFree == false) {
        for (uint i=0; i<room.participantCount; i++) {
          room.participants[i].transfer(room.requiredStakeAmount);
        }
      }
    }

    room.createdAt = block.timestamp;
    room.lockedAt = 0;
    room.participantCount = 0;
    room.totalStake = 0;
    emit EmergencyUnstake(roomId);
  }

  function getFoundersAddress() external override view returns(address payable) {
    return _foundersAddress;
  }

  function setFoundersAddress(address payable foundersAddress) onlyRole(PAUSER_ROLE) external override {
    _foundersAddress = foundersAddress;
  }
}