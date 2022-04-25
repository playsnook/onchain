// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "./ISkillToken.sol";
import "./IStakingRewards.sol";

contract StakingRewards is IStakingRewards, AccessControlEnumerableUpgradeable, PausableUpgradeable {
  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

  uint private _secondsInDay;
  uint private _initialSkillSupplyInWei; 
  uint private _maxStakingPeriodInDays; 
  uint private _minStakingPeriodInDays; 
  
  uint constant CentiPercent = 100 * 10**2;
  uint private _interestRatePerDayInCentipercents; // 1 = 0.01 %
  
  uint private _minNumberOfStakers;
  uint private _minStakingValueCoef;
  uint private _cmax; // re-calculated every _maxStakingPeriod
  uint private _cmin;
  uint private _prevInitTime;
  uint private _burningRateInPercents; //  1 = 1%
  ISkillToken private _skill;
  address _treasury;
   
  mapping (address => DepositRecord[]) private _beneficiaryDepositRecords;
  
  bool private _burnExecuted;
  bool private _isInitialized2;
  
  function initialize(
    address skill, 
    address treasury,
    uint minStakingPeriodInDays, 
    uint minNumberOfStakers,
    uint interestRatePerDayInCentipercents, 
    uint initialSkillSupplyInWei,
    uint minStakingValueCoef, // factor by which Cmax is devided to get Cmin, Cmin = Cmax / minStatkingValueCoef
    uint burningRateInPercents,
    uint secondsInDay,
    address adminAccount
  ) initializer public 
  {
    require(
      interestRatePerDayInCentipercents > 0 &&  
      minNumberOfStakers > 0 && 
      initialSkillSupplyInWei > 0 &&
      minStakingValueCoef > 0, "StakingRewards: Zero values not allowed"
    );


    __AccessControlEnumerable_init();
    __Pausable_init();
    
    _skill = ISkillToken(skill);
    _treasury = treasury;
    _minStakingPeriodInDays = minStakingPeriodInDays;
    _minNumberOfStakers = minNumberOfStakers;
    _interestRatePerDayInCentipercents = interestRatePerDayInCentipercents;
    _initialSkillSupplyInWei = initialSkillSupplyInWei;
    _minStakingValueCoef = minStakingValueCoef;
    _burningRateInPercents = burningRateInPercents;
    _secondsInDay = secondsInDay;

    _setupRole(DEFAULT_ADMIN_ROLE, adminAccount);
    _setupRole(PAUSER_ROLE, adminAccount);
  }

  function initialize2(address ecosystem) external {
    require(_isInitialized2 == false, 'StakingRewards: already executed');
    uint balance = _skill.balanceOf(address(this));
    _skill.transfer(ecosystem, balance);
    _isInitialized2 = true;
  }

  function burnBalance() external override {
    require(_isInitialized2 == true, 'StakingRewards: requires initialize2() execution');
    // the only intended source of balance of the contract is BurnSafe from other networks
    uint balance = _skill.balanceOf(address(this)); 
    _skill.burn(address(this), balance);
  }
  
  function getSecondsInDay() external override view returns (uint) {
    return _secondsInDay;
  } 

  function getInitialSNKSupplyInWei() external override view returns (uint) {
    return _initialSkillSupplyInWei;
  }

  function getMaxStakingPeriodInDays() external override view returns (uint) {
    return _maxStakingPeriodInDays;
  }

  function getMinStakingPeriodInDays() external override view returns (uint) {
    return _minStakingPeriodInDays;
  }

  function getInterestRatePerDayInCentipercents() external override view returns (uint) {
    return _interestRatePerDayInCentipercents;
  }

  function getMinNumberOfStakers() external override view returns (uint) {
    return _minNumberOfStakers;
  }

  function getMinStakingValueCoef() external override view returns(uint) {
    return _minStakingValueCoef;
  }

  function getPrevInitTime() external override view returns(uint) {
    return _prevInitTime;
  }

  function getBurningRateInPercents() external override view returns(uint) {
    return _burningRateInPercents;
  }

  // SNK is rebrandad name of SKILL
  function getSNKAddress() external override view returns (address) {
    return address(_skill);
  }

  function getTreasuryAddress() external override view returns (address) {
    return address(_treasury);
  }

  modifier onlyTreasury() {
    require(msg.sender == _treasury, 'StakingRewards: Not treasury');
    _;
  }

  function init(uint maxStakingPeriodInDays) external override onlyTreasury() whenNotPaused() {
    
    _prevInitTime = block.timestamp;
    _maxStakingPeriodInDays = maxStakingPeriodInDays; // = tmax
    uint T = _skill.balanceOf(address(this));
    uint S = _skill.totalSupply();
    uint S0 = _initialSkillSupplyInWei;

    _cmax = S0 * T  * CentiPercent / _interestRatePerDayInCentipercents / _minNumberOfStakers / S / maxStakingPeriodInDays;
    if (_cmax > T) { 
      _cmax = T;
    }
    _cmin = _cmax / _minStakingValueCoef;
    emit PeriodStart(_cmin, _cmax, T, S);
  }

  function getDepositLimits() external override view returns(uint, uint) {
    return (_cmin, _cmax);
  }

  function computeRewards(uint amount, uint periodInDays) external override view 
    returns (uint rewards, uint rewardsToBurn, uint rewardsToPay) 
  {
    return _computeRewards(amount, periodInDays);
  }

  function _computeRewards(uint amount, uint periodInDays) internal view 
    returns (uint rewards, uint rewardsToBurn, uint rewardsToPay) 
  {
    
    rewards = amount * periodInDays * _skill.totalSupply() * _interestRatePerDayInCentipercents / CentiPercent / _initialSkillSupplyInWei;
    rewardsToBurn = rewards * _burningRateInPercents / 100;
    rewardsToPay = rewards - rewardsToBurn;
  }
  
  
  function deposit(uint amount, uint periodInDays) external whenNotPaused() override {
    revert("No more deposits allowed");
    require(block.timestamp > _prevInitTime && block.timestamp < _prevInitTime + _maxStakingPeriodInDays * _secondsInDay, 'Reward cycle is not initialized' );
    require(periodInDays >= _minStakingPeriodInDays && periodInDays <= _maxStakingPeriodInDays, 'Invalid staking period');
    require(amount >= _cmin && amount <= _cmax, 'Invalid staking amount'); 
        
    uint releaseTime = block.timestamp + periodInDays * _secondsInDay;
    address beneficiary = msg.sender;
    TokenTimelock tokenTimelock = new TokenTimelock(IERC20(address(_skill)), beneficiary, releaseTime);
    (uint rewards, uint rewardsToBurn, uint rewardsToPay) = _computeRewards(amount, periodInDays);
        
    require(_skill.transferFrom(msg.sender, address(tokenTimelock), amount), 'Not enough funds');
    _skill.burn(address(this), rewardsToBurn);
    _skill.transfer(address(tokenTimelock), rewardsToPay);

    DepositRecord memory depositRecord = DepositRecord(
      tokenTimelock,
      amount,
      rewards,
      rewardsToBurn,
      rewardsToPay
    );

    _beneficiaryDepositRecords[beneficiary].push(depositRecord);

    emit Deposit(
      beneficiary, 
      address(tokenTimelock), 
      amount, 
      rewards,
      rewardsToBurn,
      rewardsToPay
    );
  }

  function getDepositRecords(address beneficiary) external view override returns (DepositRecord[] memory) {
    return _beneficiaryDepositRecords[beneficiary];
  }
  
  function pause() external override onlyRole(PAUSER_ROLE) whenNotPaused() {
    _pause();
  }

  function unpause() external override onlyRole(PAUSER_ROLE) whenPaused() {
    _unpause();
  }

  // for adjusting vesting
  function burnFromOldVesting() onlyRole(PAUSER_ROLE) whenNotPaused() external {
    require(_burnExecuted == false, 'Already executed');
    address oldVestingAddress = 0x73F45FA6f81535596600b7C2C93F4b5A71Cb55E8;
    uint balanceOfOldVesting = _skill.balanceOf(oldVestingAddress); 
    _skill.burn(oldVestingAddress, balanceOfOldVesting);
    _burnExecuted = true;
  }

  
}