// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "./IDescriptorUser.sol";

interface IMarketplace is IDescriptorUser {
  event SnookPlacementForSale(uint tokenId);
  event SnookRemovalFromSale(uint tokenId);
  event SnookBuy(uint tokenId, address seller, address buyer, uint price);
  event SnookPriceChange(uint tokenId, uint previousPrice, uint price);
  struct TokenForSale {
    uint tokenId;
    address tokenOwner;
    string tokenURI;  
    uint price;
    uint listedAt;
  }

  function getSNKAddress() external view returns (address);
  function getSNOOKAddress() external view returns (address);
  function getMarketplaceSafeAddress() external view returns (address);
  function getMarketplaceFee() external view returns (uint);

  function setMarketplaceFee(uint marketplaceFee) external;
  function setMarketplaceSafeAddress(address payable safe) external;

  function placeSnookForSale(uint tokenId, uint price) external;
  function getAmountToSeller(uint tokenId) view external returns(uint);
  function changeSnookPrice(uint tokenId, uint price) external;
  function buySnook(uint tokenId) payable external;
  function getCountOfTokensForSale() external view returns(uint);
  function getTokensForSale(uint start, uint end) external view returns(TokenForSale[] memory);
  function pause() external;
  function unpause() external;
}