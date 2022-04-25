//SPDX-License-Identifier: Unlicense

pragma solidity >=0.6.6;

import '@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol';
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol';
import "./ISkillToken.sol";

contract UniswapUSDCSkill  {
  uint _usdcDecimals;
  uint _skillDecimals;
  address private _factory;
  address private _usdc;
  address private _skill;
  
  constructor(address factory, address usdc, address skill) public {
    _factory = factory;
    _usdc = usdc;
    _skill = skill;
    _usdcDecimals = ISkillToken(_usdc).decimals(); // to get decimals definition
    _skillDecimals = ISkillToken(_skill).decimals();
  }


  function getSnookPriceInSkills() public view returns (uint k) {
    IUniswapV2Pair pair = IUniswapV2Pair( IUniswapV2Factory(_factory).getPair(_usdc, _skill));
    uint snookPriceUSDC = 10**_usdcDecimals * 25 / 100;  // (=0.25 USDC = 0.25 USD) 
    /*  To determine noUniswapK, assume SKILL current rate to be X=0.25 USD then price of SNOOK 
        which is always 0.25 USD in SKILL is X/0.25 = 0.25/0.25 = 1.
    */
    uint noUniswapK = 10**_skillDecimals * 1;
    if (address(pair) == address(0) ) {
      k =  noUniswapK; 
    } else {
      (uint reserves0, uint reserves1,) = pair.getReserves();
      if (reserves0 == 0 || reserves1 == 0) {
        k = noUniswapK;
      } else {
        (uint reservesUSDC, uint reservesSkill) = _usdc == pair.token0() ? ( reserves0, reserves1) : (reserves1, reserves0);
        k = UniswapV2Library.quote(snookPriceUSDC, reservesUSDC, reservesSkill);   
      }
    }
  }
}