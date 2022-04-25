// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IPRNG {
  function generate() external;
  function read(uint64 max) external returns (uint64);
}