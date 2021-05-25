// SPDX-License-Identifier: MIT

// Test constract 
pragma solidity ^0.8.0;


contract Test {
  uint counter = 0;
  uint[] arr;
  constructor () {
    arr = new uint[](0);
  }
  function increase() public {
    counter += 1;
  }
  function push(uint i) public {
    arr.push(i);
  }
  function read() public view returns (uint[] memory) {
    return arr;
  }
  
}