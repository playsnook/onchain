// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "./ISkillToken.sol";
import "./ICollectionList.sol";

import "hardhat/console.sol";

contract CollectionList is ICollectionList, AccessControlEnumerableUpgradeable, PausableUpgradeable {
  using EnumerableSet for EnumerableSet.Bytes32Set;

  struct DepositRecord {
    address depositor;
    uint amount;
  }

  bytes32 private constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
  
  using Counters for Counters.Counter;
  Counters.Counter private _collectionIdCounter;

  ISkillToken private _skill;
  mapping (bytes32 => Collection) private _collectionIdCollection;
  EnumerableSet.Bytes32Set private _collectionIds;

  /// @dev For fast withdraw by depositor. 
  mapping(bytes32=>mapping(address=>uint)) private _collectionIdDepositorAmount;

  /// @dev For returning deposits when collection is removed.  
  mapping(bytes32=>DepositRecord[]) private _collectionIdDepositRecords;
  
  modifier withValidCollectionId(bytes32 collectionId) {
    require(_collectionIds.contains(collectionId) == true, "CollectionList: invalid collection id");
    _;
  }


  /// Returns collection unique id
  function _createCollectionId() internal returns (bytes32) {
    _collectionIdCounter.increment();
    uint counter = _collectionIdCounter.current();
    bytes32 id = keccak256(abi.encode(block.chainid, counter));
    return id;
  } 

  function initialize(address adminAccount, address skill) public initializer {
    __AccessControlEnumerable_init();
    __Pausable_init();
    _setupRole(DEFAULT_ADMIN_ROLE, adminAccount);

    _skill = ISkillToken(skill);
  }

  function addCollection(
    string calldata name,
    uint chainId,
    address token,
    uint accessThresholdInCollectionTokens,
    uint activityThresholdInSNK,
    uint lockPeriodInSeconds,
    uint revshareInPercents,
    address payable revshareRecipient
  ) onlyRole(PAUSER_ROLE) external override  {

    bytes32 id = _createCollectionId();
    _collectionIdCollection[id] = Collection({
      id: id,
      name: name,
      chainId: chainId,
      token: token,
      accessThresholdInCollectionTokens: accessThresholdInCollectionTokens,
      activityThresholdInSNK: activityThresholdInSNK,
      lockPeriodInSeconds: lockPeriodInSeconds,
      revshareInPercents: revshareInPercents,
      revshareRecipient: revshareRecipient,
      depositedSNK: 0,
      active: activityThresholdInSNK == 0 ? true: false,
      lockedAt: block.timestamp,
      depositsEnabled: true
    });
    _collectionIds.add(id);
    emit CollectionAdded(id);
  }

  function toggleDepositAccepting(bytes32 collectionId) 
    withValidCollectionId(collectionId) onlyRole(PAUSER_ROLE)
    external override 
  {
    _collectionIdCollection[collectionId].depositsEnabled = !_collectionIdCollection[collectionId].depositsEnabled;
  }

  function getDepositRecordCount(bytes32 collectionId) 
    withValidCollectionId(collectionId) view external override returns(uint) 
  {
    return _collectionIdDepositRecords[collectionId].length;
  }


  function releaseDeposits(bytes32 collectionId, uint count) 
    withValidCollectionId(collectionId) onlyRole(PAUSER_ROLE)
    external override
  {
    require(
      _collectionIdCollection[collectionId].depositsEnabled == false, 
      'CollectionList: depositing should be disabled'
    );
    DepositRecord[] storage depositRecords = _collectionIdDepositRecords[collectionId];
    uint i;
    for (i=0; i<count; i++) {
      uint len = depositRecords.length; 
      if (len == 0) {
        break;
      }
      DepositRecord memory depositRecord = depositRecords[len-1];
      _skill.transfer(depositRecord.depositor, depositRecord.amount);
      depositRecords.pop();
    }
    emit DepositsReleased(collectionId, i, depositRecords.length);
  }

  function removeCollection(bytes32 collectionId) /// TODO: changing collection id type from uint to bytes32 
    withValidCollectionId(collectionId) onlyRole(PAUSER_ROLE)
    external override  
  {
    require(_collectionIdDepositRecords[collectionId].length == 0, 'CollectionList: release deposits first');
    _collectionIds.remove(collectionId);
    emit CollectionRemoved(collectionId);
  }

  function setLock(bytes32 collectionId) 
    withValidCollectionId(collectionId) onlyRole(PAUSER_ROLE)
    external override  
  {
    _collectionIdCollection[collectionId].lockedAt = block.timestamp;
  }

  function setName(bytes32 collectionId, string memory name) 
    withValidCollectionId(collectionId) onlyRole(PAUSER_ROLE)
    external override  
  {
    _collectionIdCollection[collectionId].name = name;
  }

  function setChainId(bytes32 collectionId, uint chainId) 
    withValidCollectionId(collectionId) onlyRole(PAUSER_ROLE)
    external override  
  {
    _collectionIdCollection[collectionId].chainId = chainId;
  }

  function setToken(bytes32 collectionId, address token)
    withValidCollectionId(collectionId) onlyRole(PAUSER_ROLE)
    external override  
  {
    _collectionIdCollection[collectionId].token = token;
  }

  function setAccessThresholdInCollectionTokens(bytes32 collectionId, uint accessThresholdInCollectionTokens)
    withValidCollectionId(collectionId) onlyRole(PAUSER_ROLE)
    external override  
  {
    _collectionIdCollection[collectionId].accessThresholdInCollectionTokens = accessThresholdInCollectionTokens;
  }

  function setActivityThresholdInSNK(bytes32 collectionId, uint activityThresholdInSNK)
    withValidCollectionId(collectionId) onlyRole(PAUSER_ROLE) 
    external override  
  {
    _collectionIdCollection[collectionId].activityThresholdInSNK = activityThresholdInSNK;
  }

  function setRevshareRecipient(bytes32 collectionId, address payable revshareRecipient) 
    withValidCollectionId(collectionId) onlyRole(PAUSER_ROLE)
    external override  
  {
    _collectionIdCollection[collectionId].revshareRecipient = revshareRecipient;
  }

  function setRevshareInPercents(bytes32 collectionId, uint revshareInPercents)
    withValidCollectionId(collectionId) onlyRole(PAUSER_ROLE)
    external override 
  {
    _collectionIdCollection[collectionId].revshareInPercents = revshareInPercents;
  }

  function setLockPeriodInSeconds(bytes32 collectionId, uint lockPeriodInSeconds) 
    withValidCollectionId(collectionId) onlyRole(PAUSER_ROLE)
    external override  
  {
    _collectionIdCollection[collectionId].lockPeriodInSeconds = lockPeriodInSeconds;
  }


  function depositSNK(bytes32 collectionId, uint amount) 
    withValidCollectionId(collectionId) whenNotPaused() 
    external override  
  {
    Collection storage collection = _collectionIdCollection[collectionId];
    require(collection.depositsEnabled == true, "CollectionList: deposits disabled");
    require(_skill.transferFrom(msg.sender, address(this), amount), "CollectionList: not enough funds");
    
    collection.depositedSNK += amount;
    collection.active = collection.depositedSNK >= collection.activityThresholdInSNK;
    _collectionIdDepositorAmount[collectionId][msg.sender] = amount;
    _collectionIdDepositRecords[collectionId].push(DepositRecord({
      depositor: msg.sender,
      amount: amount
    }));
    emit SNKDeposited(collection.id, msg.sender, amount, collection.active);
  }

  function withdrawSNK(bytes32 collectionId) 
    withValidCollectionId(collectionId) whenNotPaused() 
    external override  
  {
    Collection storage collection = _collectionIdCollection[collectionId];
    uint amount = _collectionIdDepositorAmount[collectionId][msg.sender];
    require(amount > 0, "CollectionList: nothing to withdraw");
    require(collection.lockedAt + collection.lockPeriodInSeconds < block.timestamp, "CollectionList: funds are locked");
    _skill.transfer(msg.sender, amount);
    collection.depositedSNK -= amount;
    _collectionIdDepositorAmount[collectionId][msg.sender] = 0;
    collection.active = collection.depositedSNK >= collection.activityThresholdInSNK;
    emit SNKWithdrawn(collection.id, msg.sender, amount, collection.active);
  }

  /// @dev Function used by BBT contract
  function isActive(bytes32 collectionId) withValidCollectionId(collectionId)
    external override view returns(bool)   
  {
    return _collectionIdCollection[collectionId].active;
  }

  function getRevshareRecipient(bytes32 collectionId) withValidCollectionId(collectionId) 
    external override view returns(address payable) 
  {
    return _collectionIdCollection[collectionId].revshareRecipient;
  }

  function getRevshareInPercents(bytes32 collectionId) withValidCollectionId(collectionId) 
    external override view returns(uint) 
  {
    return _collectionIdCollection[collectionId].revshareInPercents;
  }

  function getCollectionCount() external override view returns (uint) {
    return _collectionIds.length();
  }

  function getCollections(uint startIdx, uint endIdx) 
    external override view returns(Collection[] memory) 
  {
    require(startIdx<endIdx && endIdx <= _collectionIds.length(), "CollectionList: invalid indexes");
    Collection[] memory slice = new Collection[](endIdx-startIdx);
    for (uint i=startIdx; i<endIdx; i++) {
      bytes32 id = _collectionIds.at(i);
      slice[i-startIdx] = _collectionIdCollection[id];
    } 
    return slice;
  }

  function getCollection(bytes32 collectionId) 
    external override view returns(Collection memory) 
  {
    require(_collectionIds.contains(collectionId), 'CollectionList: invalid collection id');
    return _collectionIdCollection[collectionId];
  }

  function getPauserRole() external pure override returns(bytes32) {
    return PAUSER_ROLE;
  }
  
}