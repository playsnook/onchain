const { expect } = require("chai");
const { ethers } = require("hardhat");
const moment = require('moment');
const UniswapV2FactoryArtifact = require('@uniswap/v2-core/build/UniswapV2Factory.json');
const UniswapV2Router02Artifact = require('@uniswap/v2-periphery/build/UniswapV2Router02.json');

describe("SpecialSkinRewards", function() {

  let skillToken;  
  let snookToken;
  let snookGame;
  let treasury;
  let signers;
  let uniswap;
  const gamersBalance = ethers.utils.parseEther('100');
  const TreasuryBalance = ethers.utils.parseEther('1000');
  const SSRPercentage = 10;
  const SSRBudget = TreasuryBalance.mul(SSRPercentage).div(100);
  const InitialSkillSupply = 40000000;
  beforeEach(async ()=>{
    signers = await ethers.getSigners();
    
    const SkillToken = await ethers.getContractFactory('SkillToken');
    skillToken = await SkillToken.deploy(InitialSkillSupply);
    await skillToken.deployed();

    const UsdcToken = await ethers.getContractFactory('UsdcToken');
    const usdcToken = await UsdcToken.deploy();
    await usdcToken.deployed();
    
    const UniswapV2Factory = await ethers.getContractFactory(
      UniswapV2FactoryArtifact.abi,
      UniswapV2FactoryArtifact.bytecode
    );
    const uniswapV2Factory = await UniswapV2Factory.deploy(signers[0].address);
    await uniswapV2Factory.deployed();

    const UniswapV2Router02 = await ethers.getContractFactory(
      UniswapV2Router02Artifact.abi,
      UniswapV2Router02Artifact.bytecode
    );
    const uniswapV2Router02 = await UniswapV2Router02.deploy(uniswapV2Factory.address, signers[0].address);
    await uniswapV2Router02.deployed();
      
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

    const Uniswap = await ethers.getContractFactory('UniswapUSDCSkill');
    uniswap = await Uniswap.deploy(uniswapV2Factory.address, usdcToken.address, skillToken.address);
    await uniswap.deployed();
    
    const SnookToken = await ethers.getContractFactory('SnookToken');
    snookToken = await SnookToken.deploy();
    await snookToken.deployed();

    const SnookGame = await ethers.getContractFactory('SnookGame');
    snookGame = await SnookGame.deploy(snookToken.address, skillToken.address, uniswap.address);
    await snookGame.deployed();

    await skillToken.grantRole(await skillToken.BURNER_ROLE(), snookGame.address);
    await snookToken.grantRole(await snookToken.MINTER_ROLE(), snookGame.address);
   
    const SpecialSkinRewards = await ethers.getContractFactory('SpecialSkinRewards');
    specialSkinRewards = await SpecialSkinRewards.deploy(
      skillToken.address,
      snookToken.address,
      snookGame.address,
      3
    );
    await specialSkinRewards.deployed();
    
    await skillToken.transfer(signers[1].address, gamersBalance);
    await skillToken.transfer(signers[2].address, gamersBalance);

    const Treasury = await ethers.getContractFactory('Treasury');
    treasury = await Treasury.deploy(
      skillToken.address,
      [specialSkinRewards.address],
      [SSRPercentage],
      [5]
    );
    await treasury.deployed();
    
    // Tap up treasury balance
    await skillToken.transfer(treasury.address, TreasuryBalance);
    await treasury.allocate();    
    
  });

  it('tests rewards for a single special skin with one star', async ()=>{
    const snookPrice = await uniswap.getSnookPriceInSkills();
    await skillToken.connect(signers[1]).approve(snookGame.address, snookPrice);
    await snookGame.mint(signers[1].address, 1, 1, 1, 'test');
    const balanceStart = await skillToken.balanceOf(signers[1].address);
    await specialSkinRewards.sendRewards();
    // signer[1] should get all the rewards as it's the only special skin owner
    const balanceEnd = await skillToken.balanceOf(signers[1].address);
    expect(balanceEnd).to.be.equal(balanceStart.add(SSRBudget));
  
  });

  it('tests rewards for two special skins with a single star', async ()=>{
    const snookPrice = await uniswap.getSnookPriceInSkills();
    await skillToken.connect(signers[1]).approve(snookGame.address, snookPrice);
    await snookGame.mint(signers[1].address, 1, 1, 1, 'test');
    await skillToken.connect(signers[2]).approve(snookGame.address, snookPrice);
    await snookGame.mint(signers[2].address, 1, 1, 1, 'test');
    const balanceStart1 = await skillToken.balanceOf(signers[1].address);
    const balanceStart2 = await skillToken.balanceOf(signers[2].address);

    await specialSkinRewards.sendRewards();

    // signer[1] should get half of the rewards
    const balanceEnd1 = await skillToken.balanceOf(signers[1].address);
    expect(balanceEnd1).to.be.equal(balanceStart1.add(SSRBudget.div(2)));
    // signer[2] should get halft of the rewards
    const balanceEnd2 = await skillToken.balanceOf(signers[2].address);
    expect(balanceEnd2).to.be.equal(balanceStart2.add(SSRBudget.div(2)));
    expect(await skillToken.balanceOf(specialSkinRewards.address)).to.equal(0);

  });

});
