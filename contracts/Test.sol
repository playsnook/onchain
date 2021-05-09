// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;


contract Test {
  uint counter = 0;
  function increase() public {
    counter += 1;
  }
}