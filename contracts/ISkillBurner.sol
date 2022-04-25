//SPDX-License-Identifier: Unlicense

pragma solidity >=0.5.0;

interface ISkillBurner {
  function burn(address, uint) external;
  function getExternalBurnerAddress() view external returns(address);
}