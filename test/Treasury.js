const { expect } = require("chai");
const { ethers } = require("hardhat");
const delay = require('delay');
const moment = require('moment');
const UniswapV2FactoryArtifact = require('@uniswap/v2-core/build/UniswapV2Factory.json');
const UniswapV2Router02Artifact = require('@uniswap/v2-periphery/build/UniswapV2Router02.json');

describe("Treasury", function() {

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

  
    // tap up Skill balance of treasury
    await skillToken.transfer(treasury.address, startBalance); 

  });

  it.skip('tests initialization fails on invalid shares', async ()=>{
    const payees = [
      signers[0].address, // founders
      signers[1].address, // should be staking contract address 
      snookGame.address, // game
    ];
    const shares = [
      1000, // = 0.01 * 1000 = 10%
      1000, // 10%
      9000, // 90% 
    ];
    const cycles = [
      5,
      5,
      5
    ];
    await expect(
      treasury.initialize(payees,shares,cycles)
    ).to.be.revertedWith('Invalid shares');
  });

  it.skip('tests double initialization fails', async ()=>{
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
      5,
      5,
      5
    ];
    await treasury.initialize(payees,shares,cycles);
    await expect(
      treasury.initialize(payees,shares,cycles)
    ).to.revertedWith('Already initialized');
  });

  
  it('tests allocation time periodicities', async ()=>{
    
    const payees = [
      signers[0].address, // founders
      signers[1].address, // should be staking contract address 
      snookGame.address, // game
    ];
    const shares = [
      1000, // 
      1000, // 
      1000, //  
    ];
    const cycles = [
      2,
      3,
      4
    ];
    await treasury.initialize(payees,shares,cycles);


    // transfer funds from treasury to payees
    const balance0 = await skillToken.balanceOf(treasury.address);
    await treasury.transfer();
    const balance1 = await skillToken.balanceOf(treasury.address);
    expect(balance1).to.equal(balance0.mul(7).div(10));

    // trying to transfer before required waiting period causes no transfer
    await treasury.transfer();
    const balance2 = await skillToken.balanceOf(treasury.address);
    expect(balance2.eq(balance0.mul(7).div(10))).to.be.true;

    // wait 2 seconds and transfer, only the first payee will get budget
    await delay(2.1*1000);
    await treasury.transfer();
    const balance3 = await skillToken.balanceOf(treasury.address);
    expect(balance3.eq(balance2.mul(9).div(10))).to.be.true;

    // wait anither 1 second so that only 2nd payee gets budget
    // the first started a new cycle of 2 secs before 1 sec so
    // it will not get transfer
    await delay(1*1000);
    await treasury.transfer();
    const balance4 = await skillToken.balanceOf(treasury.address);
    expect(balance4.eq(balance3.mul(9).div(10))).to.be.true;

  });
});
