// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "./ISnookState.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract SnookState is ISnookState, Initializable {

  mapping (uint => Descriptor) private _descriptors;
 
  address private _game;
  //address private _skinRewards;
  address private _marketplace;
  address private _afterdeath;
  // address private _sge;
  address private _UNUSED;

  function getSnookGameAddress() external override view returns (address) {
    return _game;
  }

  function getMarketplaceAddress() external override view returns (address) {
    return _marketplace;
  }

  function getAfterdeathAddress() external override view returns (address) {
    return _afterdeath;
  }


  function initialize(
    address game,
    address afterdeath
  ) initializer public {
    _game = game;    
    _afterdeath = afterdeath;
  }

  function initialize2(address marketplace) public {
    require(marketplace != _marketplace, "SnookState: marketplace already initialized");
    _marketplace = marketplace;
  }

  modifier onlyGameContracts {
    require(
      msg.sender == _game || 
      msg.sender == _marketplace || 
      msg.sender == _afterdeath, 
      'SnookState: Not game contracts'
    );
    _;
  }

  function getDescriptor(uint tokenId) onlyGameContracts external override view returns(Descriptor memory) {
    return _descriptors[tokenId];
  }

  function setDescriptor(uint tokenId, Descriptor calldata descriptor) onlyGameContracts external override {
    _setDescriptor(tokenId, descriptor);

  }
  function deleteDescriptor(uint tokenId) onlyGameContracts external override {
    delete _descriptors[tokenId];
  }
  function _setDescriptor(uint tokenId, Descriptor calldata descriptor) internal {
    _descriptors[tokenId] = descriptor;
  }
  
  function setDescriptors(uint[] calldata tokenIds, Descriptor[] calldata descriptors) onlyGameContracts external override {
    require(tokenIds.length == descriptors.length, 'SnookState: invalid lengths');
    for (uint i=0; i<tokenIds.length; i++) {
      _setDescriptor(tokenIds[i], descriptors[i]);
    }
  }
} 