// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import "./IBurnSafe.sol";

contract AnyswapV5ERC20 {
  function Swapout(uint256 amount, address bindaddr) public returns (bool) {}
  function balanceOf(address) public view returns (uint256) {}
}
contract BurnSafe is IBurnSafe, AccessControlEnumerableUpgradeable, PausableUpgradeable {    
  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

  address private _stakingRewards;
  AnyswapV5ERC20 private _anyswap;
  uint private _maximumSwapAmount;
  uint private _minimumSwapAmount;
  uint private _maximumSwapFeeAmount;
  uint private _minimumSwapFeeAmount;


  function initialize(
    address anyswap,
    address stakingRewards,
    uint maximumSwapAmount,
    uint minimumSwapAmount,
    uint maximumSwapFeeAmount,
    uint minimumSwapFeeAmount
  ) public initializer {
    __AccessControlEnumerable_init();
    __Pausable_init();
    
    _anyswap = AnyswapV5ERC20(anyswap);
    _stakingRewards = stakingRewards;
    _maximumSwapAmount = maximumSwapAmount;
    _minimumSwapAmount = minimumSwapAmount;
    _maximumSwapFeeAmount = maximumSwapFeeAmount;
    _minimumSwapFeeAmount = minimumSwapFeeAmount;
  }

  function getMaximumSwapAmount() view external override returns(uint) {
    return _maximumSwapAmount;
  }

  function getMinimumSwapAmount() view external override returns(uint) {
    return _minimumSwapAmount;
  }

  function getMaximumSwapFeeAmount() view external override returns(uint) {
    return _maximumSwapFeeAmount;
  }

  function getMinimumSwapFeeAmount() view external override returns(uint) {
    return _minimumSwapFeeAmount;
  } 

  function setMaximumSwapAmount(uint maximumSwapAmount) external override onlyRole(PAUSER_ROLE) {
    _maximumSwapAmount = maximumSwapAmount;
  }

  function setMinimumSwapAmount(uint minimumSwapAmount) external override onlyRole(PAUSER_ROLE) {
    _minimumSwapAmount = minimumSwapAmount;
  }

  function setMinimumSwapFeeAmount(uint minimumSwapFeeAmount) external override onlyRole(PAUSER_ROLE) {
    _minimumSwapFeeAmount = minimumSwapFeeAmount;
  }

  function setMaximumSwapFeeAmount(uint maximumSwapFeeAmount) external override onlyRole(PAUSER_ROLE) {
    _maximumSwapFeeAmount = maximumSwapFeeAmount;
  } 

  function getBalance() external override view returns(uint) {
    return _anyswap.balanceOf(address(this));
  }

  function getPolygonStakingRewardsAddress() view external override returns(address) {
    return _stakingRewards;
  }

  // Keccak-25: bdad80d0cc86033147fdaaaa42c1134557849e165a5666e2fffe82f93548d4a8
  function swapoutBalance() external override {
    uint balance = _anyswap.balanceOf(address(this)); 
    require(balance >= _minimumSwapAmount, 'BurnSafe: balance is less than minimal swap');
    uint amount = balance > _maximumSwapAmount ? _maximumSwapAmount : balance;
    _anyswap.Swapout(amount, _stakingRewards);
    emit Swapout(amount);
  }

  function pause() external override onlyRole(PAUSER_ROLE) whenNotPaused() {
    _pause();
  }

  function unpause() external override onlyRole(PAUSER_ROLE) whenPaused() {
    _unpause();
  }
}