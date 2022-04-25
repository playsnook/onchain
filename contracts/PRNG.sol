// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./IPRNG.sol";

contract PRNG is IPRNG, Initializable {  
  uint64 public constant a1 = 21;
  uint64 public constant a2 = 35;
  uint64 public constant a3 = 4;

  uint64 public prev;
  uint64 public cur;
  uint64 public x;
  

  function generate() external override {
    cur = uint64(uint256(blockhash(block.number - 1))); 
    if (cur != prev) {
      prev = cur;
      x = cur;
    } 
    
    x ^= (x >> a1);
    x ^= (x << a2);
    x ^= (x >> a3);
  }

  // Returns integers in range [0..max-1]
  function read(uint64 max) external override view returns (uint64) {
    return x % max;
  }

}