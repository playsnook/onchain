// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
uint constant PayeeCount = 3;

interface ITreasury {
  enum PayeeIds { FOUNDERS, STAKING, SKIN }
  
  event Transfer(address payee, uint amount);
  event MintFundsAccepted(uint amount);
  event ResurrectionFundsAccepted(uint amount);
  event AcceptedFundsDistributed(uint amountPpk, uint amountStaking, uint amountTournaments);

  function transfer() external;
  function getPayees() external view returns (address[PayeeCount] memory);
  function getSharesInCentipercents() external view returns (uint[PayeeCount] memory);
  function getCyclesInDays() external view returns (uint[PayeeCount] memory);
  function getPayTimes() external view returns (uint[PayeeCount] memory);
  function getSecondsInDay() external view returns (uint);
  function getSNKAddress() external view returns (address);

  // ev2
  function getPpkBalance() external view returns (uint);
  function getTournamentsBalance() external view returns (uint);
  function getLpStakingBalance() external view returns (uint);
  function acceptMintFunds(uint amount) external; 
  function acceptResurrectionFunds(uint amount) external;
  
  function payPpkRewards(address recipient, uint amount) external;

  // luckwheel
  function mintLuckWheelSNOOK(address to) external returns(uint);
  function awardLuckWheelSNK(address to, uint prizeAmount) external;
}