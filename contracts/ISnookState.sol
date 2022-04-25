// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IDescriptorUser.sol";

interface ISnookState is IDescriptorUser { 
  function getSnookGameAddress() external view returns (address);
  function getMarketplaceAddress() external view returns (address);
  function getAfterdeathAddress() external view returns (address);
  
  function getDescriptor(uint tokenId) external view returns(Descriptor memory);
  function setDescriptor(uint tokenId, Descriptor memory descriptor) external;
  function setDescriptors(uint[] calldata tokenIds, Descriptor[] calldata descriptors) external;

  function deleteDescriptor(uint tokenId) external;
}