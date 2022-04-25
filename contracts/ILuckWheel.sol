// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface ILuckWheel {
  // keccack256: 60b6c2f89a3109fa0434654121cba693ec714eb2ed068a5abebf604f9124c924
  event SNKPrizeWin(address to, uint prizeAmount);
  // keccack256: 358b42ae86f1a8facae5fe253e82ceacf922b9092c24142d904f19fb5b0a35d9
  event SNOOKPrizeWin(address to, uint snookId);
  // keccack256: 9b5b377fb9211713b7e47651d4bbb7481643ec2f18027198d1043532ceb0d2ef
  event NoLuck(address to);

  function getRequiredCheckinsToSilverWheel() external view returns(uint);
  function getRequiredCheckinsToGoldenWheel() external view returns(uint);
  function checkin() external;
  function getStatusFor(address a) external view  
    returns (
      uint silverWheels, 
      uint goldenWheels, 
      uint checkinCount, 
      uint lastCheckinTimestamp
    );
  function spinGoldenWheel() external;
  function spinSilverWheel() external;
}