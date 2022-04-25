// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./ITreasury.sol";
import "./IPRNG.sol";
import "./ILuckWheel.sol";
import "hardhat/console.sol";

contract LuckWheel is Initializable, ILuckWheel {  
  
  struct AccountCheckin {
    uint timestamp;
    uint count;
  }

  mapping (address => AccountCheckin) private _accountCheckin;
  uint private _secondsInDay;
  IPRNG private _prng;
  ITreasury private _treasury;
  uint private _chanceToWin200SNK1in;
  uint private _chanceToWin500SNK1in;
  uint private _chanceToMintSNOOK1in;
  uint private _requiredCheckinsToSilverWheel;
  uint private _requiredCheckinsToGoldenWheel;

  function initialize(
    uint secondsInDay,
    IPRNG prng,
    ITreasury treasury,
    uint chanceToWin200SNK1in,
    uint chanceToWin500SNK1in,
    uint chanceToMintSNOOK1in,
    uint requiredCheckinsToSilverWheel,
    uint requiredCheckinsToGoldenWheel
  ) initializer public {
    _secondsInDay = secondsInDay;
    _prng = IPRNG(prng);
    _treasury = ITreasury(treasury);
    _chanceToWin200SNK1in = chanceToWin200SNK1in;
    _chanceToWin500SNK1in = chanceToWin500SNK1in;
    _chanceToMintSNOOK1in = chanceToMintSNOOK1in;
    _requiredCheckinsToSilverWheel = requiredCheckinsToSilverWheel;
    _requiredCheckinsToGoldenWheel = requiredCheckinsToGoldenWheel;
  }

  function getRequiredCheckinsToSilverWheel() external override view returns(uint) {
    return _requiredCheckinsToSilverWheel;
  }

  function getRequiredCheckinsToGoldenWheel() external override view returns(uint) {
    return _requiredCheckinsToGoldenWheel;
  }


  function checkin() external override {
    require(block.timestamp - _accountCheckin[msg.sender].timestamp >= _secondsInDay, 'LuckWheel: already checked in');
    _accountCheckin[msg.sender].count += 1;
    _accountCheckin[msg.sender].timestamp = block.timestamp;
  }

  function _getStatusFor(address a) internal view 
    returns (
      uint silverWheels, 
      uint goldenWheels, 
      uint checkinCount, 
      uint lastCheckinTimestamp
    ) 
  {
    checkinCount = _accountCheckin[a].count; 
    lastCheckinTimestamp = _accountCheckin[a].timestamp;
    return (
      checkinCount / _requiredCheckinsToSilverWheel, 
      checkinCount / _requiredCheckinsToGoldenWheel, 
      checkinCount, 
      lastCheckinTimestamp
    ); 
  }

  function getStatusFor(address a) external view override 
    returns (
      uint silverWheels, 
      uint goldenWheels, 
      uint checkinCount, 
      uint lastCheckinTimestamp
    ) 
  {
    return _getStatusFor(a);
  }

  function spinGoldenWheel() external override {
    (,uint goldenWheels,,) = _getStatusFor(msg.sender);
    require(goldenWheels > 0, 'No golden wheels');
    _prng.generate();
    // give 200 SNK with chance of 1/1000 or 500 SNK with chance of 1/5000 from treasury.
    _accountCheckin[msg.sender].count -= _requiredCheckinsToGoldenWheel;
    uint choice1 = _prng.read(uint64(_chanceToWin200SNK1in));
    uint choice2 = _prng.read(uint64(_chanceToWin500SNK1in));
    uint prizeAmount = 0;
    if (choice1 == 0) { // just any number
      prizeAmount = 200 ether;
    } else if (choice2 == 0) {
      prizeAmount = 500 ether;
    }
    if (prizeAmount > 0) {
      _treasury.awardLuckWheelSNK(msg.sender, prizeAmount);
      emit SNKPrizeWin(msg.sender, prizeAmount);
    } else {
      emit NoLuck(msg.sender);
    }
  }

  function spinSilverWheel() external override {
    (uint silverWheels,,,) = _getStatusFor(msg.sender);
    require(silverWheels>0, 'No silver wheels');
    _prng.generate();
    // mint snook, 50% chance
    _accountCheckin[msg.sender].count -= _requiredCheckinsToSilverWheel;
    uint choice = _prng.read(uint64(_chanceToMintSNOOK1in)); 
    if (choice == 0) {
      uint snookId = _treasury.mintLuckWheelSNOOK(msg.sender);
      emit SNOOKPrizeWin(msg.sender, snookId);
    } else {
      emit NoLuck(msg.sender);
    }
  }  
}
