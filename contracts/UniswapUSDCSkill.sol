//SPDX-License-Identifier: Unlicense

pragma solidity >=0.6.6;

import '@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol';
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import "./IERC20.sol";

import "hardhat/console.sol";


contract UniswapUSDCSkill  {
    address private _factory;
    address private _usdc;
    address private _skill;
    IUniswapV2Pair private _pair;
    constructor(address factory, address usdc, address skill) public {
        _factory = factory;
        _usdc = usdc;
        _skill = skill;
        _pair = IUniswapV2Pair(UniswapV2Library.pairFor(factory, usdc, skill));
    }

    function getSnookPriceInSkills() public view returns (uint k) {
        uint usdcDecimals = IERC20(address(_usdc)).decimals();
        uint snookPriceUSDC = 10**usdcDecimals * 25 / 100;  // (=0.25 USDC = 0.25 USD) 

        (uint reserves0, uint reserves1,) = _pair.getReserves();
        (uint reservesUSDC, uint reservesSkill) = _usdc == _pair.token0() ? ( reserves0, reserves1) : (reserves1, reserves0);

        k = UniswapV2Library.quote(snookPriceUSDC, reservesUSDC, reservesSkill);        
    }
 
}