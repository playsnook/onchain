// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./ISkillToken.sol";
import "./IStakingRewards.sol";
import "./ITreasury.sol";
import "./IAfterdeath.sol";

// luckwheel start
import "./IUniswapUSDCSkill.sol";
import "./ILuckWheel.sol";
import "./ISnookGame.sol";
import "./SnookToken.sol";
// end of luckwheel

import 'hardhat/console.sol';

contract Treasury is ITreasury, Initializable {
  uint constant ToPercent = 100; // devide shares by that factor

  event Initialize2(uint price, uint spc, uint balanceFromMint);
  
  uint public constant MINT_DIV            = 1000000;
  uint public constant MINT_PPK_MUL        =  789473;
  uint public constant MINT_LPSTAKING_MUL  =   52632;
  uint public constant MINT_TOURNAMENTS_MUL=  157895;

  // payees should be in the order defined by PayeeIds
  address[PayeeCount] private _payees;
  uint[PayeeCount] private _sharesInCentipercents;
  uint[PayeeCount] private _cyclesInDays; 
  uint[PayeeCount] private _payTimes;
  ISkillToken private _skill;
  uint private _secondsInDay;

  // EV2: new vars
  address _game;
  address _afterdeath;
  uint _ppkBalance; 
  uint _stakingBalance; 
  uint _tournamentsBalance; 

  // luckwheel storage
  ILuckWheel private _luckwheel;
  IUniswapUSDCSkill private _uniswap;
  SnookToken private _snook;
  // end of luckwheel storage

  
  function getPayees() external override view returns (address[PayeeCount] memory) {
    return _payees;
  }

  function getSharesInCentipercents() external override view returns (uint[PayeeCount] memory) {
    return _sharesInCentipercents;
  }

  function getCyclesInDays() external override view returns (uint[PayeeCount] memory) {
    return _cyclesInDays;
  }

  function getPayTimes() external override view returns (uint[PayeeCount] memory) {
    return _payTimes;
  } 

  function getSecondsInDay() external override view returns (uint) {
    return _secondsInDay;
  } 

  function getSNKAddress() external override view returns (address) {
    return address(_skill);
  }

  // luckwheel functions
  modifier onlyLuckWheel {
    require(msg.sender == address(_luckwheel), 'Treasury: Not luckwheel contract');
    _;
  }

  function initialize3(address luckwheel, address uniswap, address snook) public {
    require(address(_luckwheel) == address(0), 'Already initialized');
    _luckwheel = ILuckWheel(luckwheel);
    _uniswap = IUniswapUSDCSkill(uniswap);
    _snook = SnookToken(snook);
  }
  
  function mintLuckWheelSNOOK(address to) external override onlyLuckWheel returns(uint) {
    uint price = _uniswap.getSnookPriceInSkills();
    uint livesPerSnook = ISnookGame(_game).getLivesPerSnook();
    _skill.approve(_game, price * livesPerSnook);
    uint[] memory snookIds = ISnookGame(_game).mint2(1); 
    _snook.transferFrom(address(this), to, snookIds[0]);
    return snookIds[0];
  }

  function awardLuckWheelSNK(address to, uint prizeAmount) external override onlyLuckWheel {
    uint availableBalance = _skill.balanceOf(address(this)) - _ppkBalance - _stakingBalance - _tournamentsBalance;
    require(availableBalance >= prizeAmount, 'Not enough funds');
    _skill.transfer(to, prizeAmount);
  }
  // end of luckwheel funcs

  // ev2
  function initialize2(
    address game, 
    address afterdeath
  ) public 
  {
    require(_game == address(0), 'Treasury: Already executed');
    _game = game;
    _afterdeath = afterdeath;
    uint price = 1 ether / 2; // price of Snook in SNK; hardcoded as 0.5 SNK
    uint spc = IAfterdeath(_afterdeath).getAliveSnookCount();
    uint balanceFromMint = price * spc;
    assert(balanceFromMint<=_skill.balanceOf(address(this)));
    _distributeAcceptedFunds(balanceFromMint);
    emit Initialize2(price, spc, balanceFromMint);
  }

  modifier onlySnookGame {
    require(msg.sender == _game, 'Treasury: Not game contract');
    _;
  }

  modifier onlyAfterdeath {
    require(msg.sender == _afterdeath, 'Treasury: Not afterdeath contract');
    _;
  }

  function _distributeAcceptedFunds(uint amount) internal {
    uint amountTournaments = amount * MINT_TOURNAMENTS_MUL / MINT_DIV; 
    _tournamentsBalance += amountTournaments;
    uint amountStaking = amount * MINT_LPSTAKING_MUL / MINT_DIV; 
    _stakingBalance += amountStaking;
    uint amountPpk = amount - amountStaking - amountTournaments; 
    _ppkBalance += amountPpk;
    emit AcceptedFundsDistributed(amountPpk, amountStaking, amountTournaments);
  }

  function acceptMintFunds(uint amount) external override onlySnookGame {
    require(_skill.transferFrom(_game, address(this), amount), 'Treasury: transfer from SnookGame failed');
    _distributeAcceptedFunds(amount);
    emit MintFundsAccepted(amount);
  }

  function acceptResurrectionFunds(uint amount) external override onlyAfterdeath {
    require(_skill.transferFrom(_afterdeath, address(this), amount), 'Treasury: transfer from Afterdeath failed');
    _distributeAcceptedFunds(amount); // currently, the same distribution as for mint
    emit ResurrectionFundsAccepted(amount);
  }

  function getPpkBalance() view external override returns(uint) {
    return _ppkBalance;
  }

  function getLpStakingBalance() view external override returns(uint) {
    return _stakingBalance;
  }

  function getTournamentsBalance() view external override returns(uint) {
    return _tournamentsBalance;
  }

  function payPpkRewards(address recipient, uint amount) external override onlySnookGame {
    _ppkBalance -= amount;
    _skill.transfer(recipient, amount);
  }
  // end of ev2
  
  
  function initialize(
    address skill,
    address[PayeeCount] memory payees, 
    uint[PayeeCount] memory sharesInCentipercents, 
    uint[PayeeCount] memory cyclesInDays,
    uint secondsInDay
  ) initializer public
  {
    
    require(_sharesOk(sharesInCentipercents) == true, "Invalid shares");
    _payees = payees;
    _sharesInCentipercents = sharesInCentipercents;
    _cyclesInDays = cyclesInDays;
    _skill = ISkillToken(skill);
    _secondsInDay = secondsInDay;
  }

  function _sharesOk(uint[PayeeCount] memory shares) private pure returns (bool) {
    uint sum = 0;
    for (uint i=0; i<PayeeCount; i++) {
      sum += shares[i] / ToPercent;
    }
    bool ok = false;
    if (sum <= 100) {
      ok = true;
    }
    return ok;
  }

 
  // transfers only to founders
  function transfer() external override {
    uint balance = _skill.balanceOf(address(this));
    uint i = uint(PayeeIds.FOUNDERS);
    address payee = _payees[i];
    if (_payTimes[i] + _cyclesInDays[i] * _secondsInDay < block.timestamp) {
      uint amount = balance * _sharesInCentipercents[i] / ToPercent / 100;
      require(_skill.transfer(payee, amount), 'Treasury: could not transfer to founders');
      _payTimes[i] = block.timestamp;
      emit Transfer(payee, amount);     
    }
  }
} 