// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {ABDKMath64x64} from "abdk-libraries-solidity/ABDKMath64x64.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./IDescriptorUser.sol";
import "./ISnookState.sol";
import "./SnookToken.sol";
//import "./ISkinRewards.sol";
import "./IUniswapUSDCSkill.sol";
import "./ISkillToken.sol";
import "./IAfterdeath.sol";
import "./ITreasury.sol";
import "./ISnookGame.sol";

contract Afterdeath is IAfterdeath, IDescriptorUser, Initializable {
  uint public constant LIVES_PER_SNOOK_ON_RESURRECTION = 1;
  IUniswapUSDCSkill private _uniswap;
  ISnookState private _state;
  SnookToken private _snook;
  ISkillToken private _skill;
  //ISkinRewards private _skinRewards;
  uint private _UNUSED;
  uint private _BurialDelayInSeconds; 
  address private _treasury;
  address private _game;
  // address private _sge
  address private _UNUSED2;

  // resurrection variables
  int128[] private _traitHist;
  uint private _aliveSnookCount; 

  uint[] private _morgue;
  uint[] private _removedFromMorgue;
  
  // remove after upgrade
  function updateAliveSnookCount(uint count) external {
    require(msg.sender == 0x23fCA1B66C39F2B6ef226B9f0F47686E27e0dFa0, 'Forbidden');
    _aliveSnookCount = count;
  }

  // Getters
  function getUniswapUSDCSkillAddress() external override view returns (address) {
    return address(_uniswap);
  }

  function getSnookStateAddress() external override view returns (address) {
    return address(_state);
  }

  function getSNOOKAddress() external override view returns (address) {
    return address(_snook);
  }

  function getSNKAddress() external override view returns (address) {
    return address(_skill);
  }

  // function getSkinRewardsAddress() external override view returns (address) {
  //   return address(_skinRewards);
  // }

  function getBurialDelayInSeconds() external view override returns(uint) {
    return _BurialDelayInSeconds;
  }

  function getTreasuryAddress() external override view returns (address) {
    return _treasury;
  }

  function getSnookGameAddress() external override view returns (address) {
    return _game;
  }

  // function getSGEAddress() external override view returns (address) {
  //   return _sge;
  // }

  function getTraitHist() external override view returns (uint64[] memory) {
    uint bins = _traitHist.length;
    uint64[] memory result = new uint64[](bins);
    for (uint i=0; i<bins; i++) {
      result[i] = ABDKMath64x64.toUInt(_traitHist[i]);
    }
    return result;
  }

  function getAliveSnookCount() external override view returns (uint) {
    return _aliveSnookCount;
  }

  modifier onlyGameContracts {
    require(
      msg.sender == _game, //|| 
      // msg.sender == _sge, 
      'Afterdeath: Not game contracts'
    );
    _;
  }

  function initialize(
    address state,
    address skill,
    address snook,
    //address skinRewards,
    address uniswap,
    address treasury,
    address game,
    // address sge,
    uint BurialDelayInSeconds
  ) initializer public {
    _state = ISnookState(state);
    _snook = SnookToken(snook);
    _skill = ISkillToken(skill);
    //_skinRewards = ISkinRewards(skinRewards);
    _uniswap = IUniswapUSDCSkill(uniswap);
    _treasury = treasury;
    _game = game;
    // _sge = sge;

    _BurialDelayInSeconds = BurialDelayInSeconds;
    _traitHist = new int128[](0);
    _aliveSnookCount = 0;

    _morgue = new uint[](0);
    _removedFromMorgue = new uint[](0);
  }

  function _updateTraitHistOnMint(uint traitCount) private {
    uint bin = traitCount; // bin starts from 0
    if (_traitHist.length < (bin+1) ) {
      // resize array
      int128[] memory temp = new int128[](bin+1);
      for (uint i=0; i<_traitHist.length; i++) {
        temp[i] = _traitHist[i];
      }
      _traitHist = temp;
    }
    _traitHist[bin] = ABDKMath64x64.add(_traitHist[bin], ABDKMath64x64.fromUInt(1));
  }

  function _updateTraitHistOnDeath(uint traitCount) private {
    uint bin = traitCount;
    _traitHist[bin] = ABDKMath64x64.sub(_traitHist[bin], ABDKMath64x64.fromUInt(1));
  }

  function _updateTraitHistOnResurrection(uint traitCount) private {
    _updateTraitHistOnMint(traitCount);
  }

  function _updateTraitHistOnExtraction(uint onEntryTraitCount, uint onExtractionTraitCount) private {
    _updateTraitHistOnDeath(onEntryTraitCount);
    _updateTraitHistOnResurrection(onExtractionTraitCount);
  }

  function updateOnMint(uint traitCount, uint snookCount) onlyGameContracts external override {
    _updateTraitHistOnMint(traitCount);
    _aliveSnookCount += snookCount;
  }

  function updateOnExtraction(uint onGameEntryTraitCount, uint traitCount) onlyGameContracts 
    external override 
  {
    _updateTraitHistOnExtraction(onGameEntryTraitCount, traitCount);
  }

  function updateOnDeath(uint traitCount) onlyGameContracts external override {
    _updateTraitHistOnDeath(traitCount);
    _aliveSnookCount -= 1;
  }

  function resurrect(uint256 tokenId) external override {
    Descriptor memory d = _state.getDescriptor(tokenId);
    require(_snook.isLocked(tokenId) == true, 'Not in game'); // for alive or *buried* snooks 
    require(d.deathTime > 0, 'Alive');
    require(d.deathTime + _BurialDelayInSeconds * 1 seconds >= block.timestamp, 'Too late');
    
    require(_skill.transferFrom(msg.sender, address(this), d.resurrectionPrice), 'No funds');
    _skill.approve(_treasury, d.resurrectionPrice);
    ITreasury(_treasury).acceptResurrectionFunds(d.resurrectionPrice);
    ISnookGame(_game).increamentPpkCounter();
    d.resurrectionCount += 1; // no overflow with solc8
    d.deathTime = 0;

    _snook.setTokenURI(tokenId, d.onResurrectionTokenURI);
    d.traitCount = d.onResurrectionTraitCount;
    d.onGameEntryTraitCount = d.onResurrectionTraitCount;
    d.stars = d.onResurrectionStars;
    d.score = d.onResurrectionScore;
    
    d.lives = LIVES_PER_SNOOK_ON_RESURRECTION;
    _state.setDescriptor(tokenId, d);
    _snook.lock(tokenId, false, 'resurrect');

    _updateTraitHistOnResurrection(d.onResurrectionTraitCount);
    _aliveSnookCount += 1;
    
    emit Resurrection(msg.sender, tokenId);
  }

  function getResurrectionPrice(uint256 tokenId) 
    external override view returns (uint256) 
  {
    uint256 k = _uniswap.getSnookPriceInSkills(); // in wei
    int128 d = _getResurrectionDifficulty(tokenId); 
    uint price = ABDKMath64x64.mulu(d, k); // in wei
    if (price < k) {
      price = k;
    }
    return price;
  }

  function _getResurrectionDifficulty(uint256 tokenId) private view returns (int128) {
    Descriptor memory d = _state.getDescriptor(tokenId);
    uint bin = d.traitCount;
    int128 s = ABDKMath64x64.fromUInt(0);  // difficulty to be calculated
    for (uint i=0; i<=bin ; i++) {
      s = ABDKMath64x64.add(s, _traitHist[i]);
    }

    s = ABDKMath64x64.div(s, ABDKMath64x64.fromUInt(_aliveSnookCount)); // standing, s(b)
    int128 numOfTraits = ABDKMath64x64.fromUInt(bin);
    
    // difficulty coef,  d = exp(s) * traits^2
    return ABDKMath64x64.mul(ABDKMath64x64.exp(s), ABDKMath64x64.mul(numOfTraits, numOfTraits));
  }

  function _isToBeBuried(uint tokenId, uint deathTime) private view returns(bool) {
    return 
      _snook.isLocked(tokenId) == true && 
      deathTime > 0 && 
      deathTime + _BurialDelayInSeconds * 1 seconds < block.timestamp;
  }

  function _isWaitingForResurrection(uint tokenId, uint deathTime) private view returns(bool) {
    return 
      _snook.isLocked(tokenId) == true && 
      deathTime > 0 && 
      deathTime + _BurialDelayInSeconds * 1 seconds >= block.timestamp;
  }

  function bury(uint requestedBurials) external override {
    // _removedFromMorgue = _removedFromMorgue
    uint startIdx = _removedFromMorgue.length;
    uint uncheckedMorgueLength = _morgue.length - startIdx;
    uint maxBurials = requestedBurials > uncheckedMorgueLength ? uncheckedMorgueLength : requestedBurials;
    
    for (uint i = 0; i < maxBurials; i++) {
      uint tokenId = _morgue[startIdx+i];
      try _snook.ownerOf(tokenId) returns(address) {
        // snook is not burnt
      } catch { // the only reason to revert is burnt snook
        _removedFromMorgue.push(tokenId);
        continue;
      }
      Descriptor memory d = _state.getDescriptor(tokenId);
      if (_isToBeBuried(tokenId, d.deathTime)) {
        _snook.lock(tokenId, false, 'bury');
        _snook.burn(tokenId);
        _state.deleteDescriptor(tokenId);
        _removedFromMorgue.push(tokenId);
      }
      else if (_isWaitingForResurrection(tokenId, d.deathTime)) {
        break;
      } else { // ressurected snook
        _removedFromMorgue.push(tokenId);
      }
    }
    
    emit Bury(startIdx, _removedFromMorgue.length);
  }

  function toMorgue(uint tokenId) external override onlyGameContracts {
    _morgue.push(tokenId);
  }

  function getMorgueLength() external view override returns (uint) {
    return _morgue.length;
  }

  function getRemovedFromMorgueLength() external view override returns (uint) {
    return _removedFromMorgue.length;
  }

  function getMorgue(uint startIdx, uint endIdx) external view override returns(uint[] memory) {
    require(
      startIdx >= 0 && 
      endIdx <= _morgue.length &&
      startIdx < endIdx, 
    'Afterdeath: invalid indexes'
    );
    uint[] memory slice = new uint[](endIdx-startIdx);
    for (uint i=startIdx; i<endIdx; i++) {
      slice[i-startIdx] = _morgue[i];
    }
    return slice;
  }  

  function getRemovedFromMorgue(uint startIdx, uint endIdx) external view override returns(uint[] memory) {
    require(
      startIdx >= 0 && 
      endIdx <= _removedFromMorgue.length &&
      startIdx < endIdx,
      'Afterdeath: invalid indexes'
    );
    uint[] memory slice = new uint[](endIdx-startIdx);
    for (uint i=startIdx; i<endIdx; i++) {
      slice[i-startIdx] = _removedFromMorgue[i];
    }
    return slice;
  }
}