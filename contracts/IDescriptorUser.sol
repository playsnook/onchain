// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// https://ethereum.stackexchange.com/questions/27259/how-can-you-share-a-struct-definition-between-contracts-in-separate-files
interface IDescriptorUser {
  struct Descriptor {
    uint score;
    uint stars;
    uint traitCount;

    uint resurrectionPrice;
    uint resurrectionCount;
    uint onResurrectionScore;
    uint onResurrectionStars;
    uint onResurrectionTraitCount;
    string onResurrectionTokenURI;

    // required to recalculate probability density on exit from the game
    uint onGameEntryTraitCount; 
    uint deathTime;
    bool gameAllowed; // UNUSED; 
  
    uint lives; 
    bool forSale;

  }
}