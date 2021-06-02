const { expect } = require("chai");
const moment = require('moment');
const delay = require('delay');
const UniswapV2FactoryArtifact = require('@uniswap/v2-core/build/UniswapV2Factory.json');
const UniswapV2Router02Artifact = require('@uniswap/v2-periphery/build/UniswapV2Router02.json');
const { ethers } = require("hardhat");

describe("SnookGame rewards", function() {

  let snookToken;
  let skillToken;
  let uniswap;
  let signers; 
  let snookGame;
  let treasury;
  const startBalance = ethers.utils.parseEther('1000');
  const initialSkillSupply = 40000000;
  const BurialDelay = 5;

  beforeEach(async ()=>{
    signers = await ethers.getSigners();
    console.log(`Owner of contracts: ${signers[0].address}`)
    console.log(`Signer 1: ${signers[1].address}`);
    console.log(`Signer 2: ${signers[2].address}`);

    const SkillToken = await ethers.getContractFactory('SkillToken');
    skillToken = await SkillToken.deploy(initialSkillSupply);
    await skillToken.deployed();
    console.log('skill token deployed')

    const UsdcToken = await ethers.getContractFactory('UsdcToken');
    const usdcToken = await UsdcToken.deploy();
    await usdcToken.deployed();
    console.log('usdc token deployed')
    
    const UniswapV2Factory = await ethers.getContractFactory(
      UniswapV2FactoryArtifact.abi,
      UniswapV2FactoryArtifact.bytecode
    );
    const uniswapV2Factory = await UniswapV2Factory.deploy(signers[0].address);
    await uniswapV2Factory.deployed();
    console.log('uniswap factory deployed')

    const UniswapV2Router02 = await ethers.getContractFactory(
      UniswapV2Router02Artifact.abi,
      UniswapV2Router02Artifact.bytecode
    );
    const uniswapV2Router02 = await UniswapV2Router02.deploy(uniswapV2Factory.address, signers[0].address);
    await uniswapV2Router02.deployed();
    console.log('uniswap router deployed');
      
    await usdcToken.approve(uniswapV2Router02.address, ethers.utils.parseEther('10000'));
    await skillToken.approve(uniswapV2Router02.address, ethers.utils.parseEther('10000'));
    
    await uniswapV2Factory.createPair(usdcToken.address, skillToken.address);
    await uniswapV2Router02.addLiquidity(
      usdcToken.address,
      skillToken.address,
      ethers.utils.parseEther('250'),
      ethers.utils.parseEther('1000'),
      ethers.utils.parseEther('249'),
      ethers.utils.parseEther('999'),
      signers[0].address,
      moment().add(30, 'seconds').unix()
    );
    console.log('Liquidity added')

    const Uniswap = await ethers.getContractFactory('UniswapUSDCSkill');
    uniswap = await Uniswap.deploy(uniswapV2Factory.address, usdcToken.address, skillToken.address);
    await uniswap.deployed();
    const k = await uniswap.getSnookPriceInSkills();
    console.log('k=', ethers.utils.formatEther(k))

    const SnookToken = await ethers.getContractFactory('SnookToken');
    snookToken = await SnookToken.deploy();
    await snookToken.deployed();
    console.log(`snookToken deployed`);

    const Treasury = await ethers.getContractFactory('Treasury');
    treasury = await Treasury.deploy(skillToken.address);
    await treasury.deployed();
    console.log('Treasury deployed');

    const SnookGame = await ethers.getContractFactory('SnookGame');
    snookGame = await SnookGame.deploy(
      snookToken.address, 
      skillToken.address, 
      uniswap.address,
      treasury.address,
      BurialDelay
    );
    await snookGame.deployed();
    console.log(`snookGame deployed`);

    await skillToken.grantRole(await skillToken.BURNER_ROLE(), snookGame.address);
    console.log(`SkillToken granted BURNER role to SnookGame contract`);

    await snookToken.grantRole(await snookToken.MINTER_ROLE(), snookGame.address);
    console.log('SnookToken granted MINTER role to SnookGame contract');

    // tap up Skill balances of signers
    await skillToken.transfer(signers[1].address, startBalance); 
    await skillToken.transfer(signers[2].address, startBalance); 
    console.log(`Tapped account balances up to ${startBalance}`);

  });

  it('Two players', async ()=>{

    // tap up Skill balance of treasury
    await skillToken.transfer(treasury.address, startBalance); 
    const payees = [
      signers[0].address, // founders
      signers[1].address, // should be staking contract address 
      snookGame.address, // game
    ];
    const shares = [
      1000, // = 0.01 * 1000 = 10%
      1000, // 10%
      8000, // 80% 
    ];
    const cycles = [
      1,
      1,
      1
    ];
    await treasury.initialize(payees,shares,cycles);
    const balance0 = await skillToken.balanceOf(treasury.address);

    // started period 1
    await treasury.transfer();    
    const balance1 = await skillToken.balanceOf(snookGame.address);
    expect(balance1.eq(balance0.mul(8).div(10))).to.be.true;

    const snookPrice1 = await uniswap.getSnookPriceInSkills();
    await skillToken.connect(signers[1]).approve(snookGame.address, snookPrice1);
    await snookGame.mint(signers[1].address, 0, 1, 0, 'minted with 1 star');
    
    const snookPrice2 = await uniswap.getSnookPriceInSkills();
    await skillToken.connect(signers[2]).approve(snookGame.address, snookPrice2);
    await snookGame.mint(signers[2].address, 0, 2, 0, 'minted with 2 stars');
    
    await snookGame.connect(signers[1]).allowGame(1);
    await snookGame.connect(signers[2]).allowGame(2);
    await snookGame.enterGame(1);
    await snookGame.enterGame(2);
    await snookGame.extractSnook(1, 0, 9, 0, 'now 9 stars');
    await snookGame.extractSnook(2, 0, 1, 0, 'now 1 stars');

    // tap treasury balance
    await skillToken.transfer(treasury.address, startBalance); 
    await delay(1.1*1000);
    // started period 2
    await treasury.transfer();

    await snookGame.connect(signers[2]).allowGame(2);
    await snookGame.enterGame(2);
    await snookGame.setDeathTime(2, 0, 6, 0, 'dead');

    // tap treasury balance
    await skillToken.transfer(treasury.address, startBalance); 
    await delay(1.1*1000);
    // started period 3
    await treasury.transfer();
    await snookGame.getRewards(1);
    await snookGame.getRewards(1);
    await snookGame.getRewards(1);
    const [rewardedPeriodNumber, totalPeriodCount] = await snookGame.getRewardedPeriod(1);
    console.log(rewardedPeriodNumber, totalPeriodCount);
    
    await expect(
      snookGame.getRewards(1)
    ).to.be.revertedWith('All periods are already rewarded');
    
    console.log('Snook 2-----');
    // get rewards for the 1 period
    await snookGame.getRewards(2);
    // try to get rewards for the 2 period in which we died
    await snookGame.getRewards(2);
    // try to get rewards for the 3 period 
    await snookGame.getRewards(2);
    

  });

});
