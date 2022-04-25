// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import "./SnookToken.sol";
import "./ISkillToken.sol";
import "./IMarketplace.sol";
import "./ISnookState.sol";


contract Marketplace is IMarketplace, AccessControlEnumerableUpgradeable, PausableUpgradeable {
  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

  SnookToken private _snook;
  ISkillToken private _skill;
  ISnookState private _state;
  address payable private _marketplaceSafe; 
  uint _marketplaceFee;

  mapping(uint => uint) private _tokenIdPrice;
  mapping(uint => uint) private _tokenIdListedAt;
  EnumerableSetUpgradeable.UintSet private _tokenIdsForSale;

  function initialize(
    address snook, 
    address skill,
    address state,
    address payable marketplaceSafe,
    uint marketplaceFee
  ) public initializer {
    __AccessControlEnumerable_init();
    __Pausable_init();
    
    _snook = SnookToken(snook);
    _skill = ISkillToken(skill);
    _state = ISnookState(state);
    _marketplaceSafe = marketplaceSafe;
    _marketplaceFee = marketplaceFee;
  }

  function getSNKAddress() external override view returns (address) {
    return address(_skill);
  }

  function getSNOOKAddress() external override view returns (address) {
    return address(_snook);
  }

  function getMarketplaceSafeAddress() external override view returns (address) {
    return _marketplaceSafe;
  }

  function getMarketplaceFee() external override view returns (uint) {
    return _marketplaceFee;
  }

  function setMarketplaceFee(uint marketplaceFee) external override onlyRole(PAUSER_ROLE) {
    _marketplaceFee = marketplaceFee;
  }

  function setMarketplaceSafeAddress(address payable marketplaceSafe) external override onlyRole(PAUSER_ROLE) {
    _marketplaceSafe = marketplaceSafe;
  }

  modifier onlySnookOwner(uint tokenId) {
    require(msg.sender == _snook.ownerOf(tokenId), 'Not snook owner');
    _;
  } 

  function _updateDescriptorForSale(uint tokenId, bool forSale) internal {
    Descriptor memory d = _state.getDescriptor(tokenId);
    d.forSale = forSale;
    _state.setDescriptor(tokenId, d);
  }

  function placeSnookForSale(uint tokenId, uint price) external override onlySnookOwner(tokenId)  {
    require(_snook.getApproved(tokenId) == address(this), "Contract is not approved");
    require(_snook.isLocked(tokenId) == false, 'Snook is locked');
    require(_tokenIdsForSale.contains(tokenId) == false, 'Already for sale');
    _updateDescriptorForSale(tokenId, true);
    _snook.lock(tokenId, true, 'For sale');
    _tokenIdPrice[tokenId] = price;
    _tokenIdListedAt[tokenId] = block.timestamp;
    _tokenIdsForSale.add(tokenId);
    emit SnookPlacementForSale(tokenId);
  }

  function _getAmountToMarketplaceSafe(uint tokenId) view internal returns(uint) {
    require(_tokenIdsForSale.contains(tokenId) == true, 'Not for sale');
    uint price = _tokenIdPrice[tokenId];
    uint amount = price * _marketplaceFee / 100;
    return amount;
  }

  function _getAmountToSeller(uint tokenId) view internal returns(uint) {
    require(_tokenIdsForSale.contains(tokenId) == true, 'Not for sale');
    uint price = _tokenIdPrice[tokenId];
    uint amount = price - _getAmountToMarketplaceSafe(tokenId);
    return amount;
  }

  function getAmountToSeller(uint tokenId) view external override returns(uint) {
    return _getAmountToSeller(tokenId);
  } 

  function _removeSnookFromSale(uint tokenId) internal {
    require(_tokenIdsForSale.contains(tokenId) == true, 'Not for sale');
    _updateDescriptorForSale(tokenId, false);
    _snook.lock(tokenId, false, 'Removed from sale');
    _tokenIdPrice[tokenId] = 0;
    _tokenIdListedAt[tokenId] = 0;
    _tokenIdsForSale.remove(tokenId);
  }

  function removeSnookFromSale(uint tokenId) public onlySnookOwner(tokenId) whenNotPaused() {
    _removeSnookFromSale(tokenId);
    emit SnookRemovalFromSale(tokenId);
  }

  function buySnook(uint tokenId) payable external override whenNotPaused() {
    require(_tokenIdsForSale.contains(tokenId) == true, 'Not for sale');
    uint price = _tokenIdPrice[tokenId];
    require(msg.value >= price, 'Not enough funds');
    address buyer = msg.sender;
    address payable seller = payable(_snook.ownerOf(tokenId));
    uint amountToMarketplaceSafe = _getAmountToMarketplaceSafe(tokenId);
    uint amountToSeller = _getAmountToSeller(tokenId);
    _removeSnookFromSale(tokenId);
    _snook.safeTransferFrom(seller, buyer, tokenId);
    seller.transfer(amountToSeller);
    _marketplaceSafe.transfer(amountToMarketplaceSafe);
    emit SnookBuy(tokenId, seller, buyer, price);
  }

  function changeSnookPrice(uint tokenId, uint price) external override onlySnookOwner(tokenId) whenNotPaused() {
    require(_tokenIdsForSale.contains(tokenId) == true, 'Not for sale');
    uint previousPrice = _tokenIdPrice[tokenId];
    _tokenIdPrice[tokenId] = price;
    emit SnookPriceChange(tokenId, previousPrice, price);
  }

  function getCountOfTokensForSale() view external override returns(uint) {
    return _tokenIdsForSale.length();
  }

  // Index treatment as in 
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice
  function getTokensForSale(uint start, uint end) external override view returns(TokenForSale[] memory) {
    require(start<=end, 'invalid indexes');

    if (end > _tokenIdsForSale.length()) {
      end = _tokenIdsForSale.length();
    }

    TokenForSale[] memory tokensForSale = new TokenForSale[](end-start);

    for (uint i=start; i<end; i++) {
      uint tokenId = _tokenIdsForSale.at(i);
      string memory tokenURI = _snook.tokenURI(tokenId);
      tokensForSale[i-start] = TokenForSale({
        tokenId: tokenId,
        tokenOwner: _snook.ownerOf(tokenId),
        tokenURI: tokenURI,
        price: _tokenIdPrice[tokenId],
        listedAt: _tokenIdListedAt[tokenId]
      });
    }
    return tokensForSale;
  }

  function pause() external override onlyRole(PAUSER_ROLE) whenNotPaused() {
    _pause();
  }

  function unpause() external override onlyRole(PAUSER_ROLE) whenPaused() {
    _unpause();
  }
}