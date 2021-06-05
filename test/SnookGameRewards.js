const { expect } = require("chai");
const moment = require('moment');
const delay = require('delay');
const UniswapV2FactoryArtifact = require('@uniswap/v2-core/build/UniswapV2Factory.json');
const UniswapV2Router02Artifact = require('@uniswap/v2-periphery/build/UniswapV2Router02.json');
const { ethers } = require("hardhat");

describe.skip("SnookGame rewards", function() {

  let snookToken;
  let skillToken;
  let uniswap;
  let signers; 
  let snookGame;
  let treasury;
  const startBalance = ethers.utils.parseEther('1000');
  const initialSkillSupply = 40000000;
  const BurialDelay = 5;
  const RewardPeriods = 2;

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
      BurialDelay,
      RewardPeriods
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

  it('tests scenario 1: 2 players, 4 periods', async ()=>{

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
      2,
      2,
      2
    ];
    await treasury.initialize(payees,shares,cycles);
    const treasuryBalanceP0 = await skillToken.balanceOf(treasury.address);

    // started period 1
    await treasury.transfer();    
    const gameBalanceP1 = await skillToken.balanceOf(snookGame.address);
    expect(gameBalanceP1.eq(treasuryBalanceP0.mul(8).div(10))).to.be.true;

    const snookPrice1 = await uniswap.getSnookPriceInSkills();
    await skillToken.connect(signers[1]).approve(snookGame.address, snookPrice1);
    await snookGame.mint(signers[1].address, 0, 1, 0, 'minted with 1 star');
    
    const snookPrice2 = await uniswap.getSnookPriceInSkills();
    await skillToken.connect(signers[2]).approve(snookGame.address, snookPrice2);
    await snookGame.mint(signers[2].address, 0, 2, 0, 'minted with 2 stars');
    
    await snookGame.connect(signers[1]).allowGame(1);
    await snookGame.connect(signers[2]).allowGame(2);
    await snookGame.enterGame(1,0);
    await snookGame.enterGame(2,0);
    await snookGame.extractSnook(1, 0, 4, 0, 'now 4 stars');
    await snookGame.extractSnook(2, 0, 8, 0, 'now 8 stars');

    await snookGame.connect(signers[1]).allowGame(1);
    await snookGame.connect(signers[2]).allowGame(2);
    await snookGame.enterGame(1,0);
    await snookGame.enterGame(2,0);
    await snookGame.extractSnook(1, 0, 3, 0, 'now 3 stars');
    await snookGame.extractSnook(2, 0, 7, 0, 'now 7 stars');

    const rewardablePeriodsAtP1BeforeEnd = await snookGame.getRewardablePeriods();
    expect(rewardablePeriodsAtP1BeforeEnd[0].eq(0)).to.be.true;
    expect(rewardablePeriodsAtP1BeforeEnd[1].eq(0)).to.be.true;

    await delay(2.1*1000);
    // ended period 1


    const rewardablePeriodsAtP1 = await snookGame.getRewardablePeriods();
    expect(rewardablePeriodsAtP1[0].eq(1));
    expect(rewardablePeriodsAtP1[1].eq(1));
    
    // started period 2
    await skillToken.transfer(treasury.address, startBalance); 
    await treasury.transfer();

    const budgetP1 = await snookGame.getPeriodBudget(1);
    const rewardsAtP2ForT1P1 = await snookGame.computeRewards(1,1);
    expect(rewardsAtP2ForT1P1.eq(
      budgetP1.mul(3).div(10)
    ));

    
    await snookGame.connect(signers[2]).allowGame(2);
    await snookGame.enterGame(2,0);
    await snookGame.setDeathTime(2, 0, 6, 0, 'dead');
    await delay(2.1*1000);
    // ended period 2

    // started period 3
    // tap treasury balance
    await skillToken.transfer(treasury.address, startBalance); 
    await treasury.transfer();
    
    
    await snookGame.connect(signers[1]).allowGame(1);
    await snookGame.enterGame(1, 0);
    await snookGame.extractSnook(1, 0, 3, 0, '3 stars now');
    await delay(2.1*1000);
    // ended period 3

    const rewardablePeriodsAtP3 = await snookGame.getRewardablePeriods();
    expect(rewardablePeriodsAtP3[0].eq(1)).to.be.true;
    expect(rewardablePeriodsAtP3[1].eq(2)).to.be.true;
    const rewardsAtP3ForT1P1 = await snookGame.computeRewards(1,1);
    expect(rewardsAtP3ForT1P1
      .eq(
        budgetP1.mul(3).div(10)
      )
    ).to.be.true;

    const rewardsAtP3ForT1P2 = await snookGame.computeRewards(1,2);
    const budgetP2 = await snookGame.getPeriodBudget(2);
    expect(rewardsAtP3ForT1P2
      .eq(
        budgetP2.mul(3).div(3)
      )
    ).to.be.true;


    // started period 4
    // tap treasury balance
    await skillToken.transfer(treasury.address, startBalance); 
    await treasury.transfer();

    /* 
      Snook 2 is dead and lost all his rewards
      Snook 1 is alive and has the history:
        Period 1: 4
        Period 2: no play, so should have 4 stars
        Period 3: 3 
        Period 4: no play, should gave 3 stars
    */

    await delay(2.1*1000);
    // ended period 4

    /*
      Current period is 4 (no new period was started by treasury treansfer function).
      As we defined rewardPeriods to be 2, the rewards include periods 2 and 3.
    */
    const rewardablePeriodsAtP4 = await snookGame.getRewardablePeriods();
    expect(rewardablePeriodsAtP4[0].eq(2));
    expect(rewardablePeriodsAtP4[1].eq(3));
    const rewardsAtP4ForT1P2 = await snookGame.computeRewards(1, 2);
    expect(rewardsAtP4ForT1P2.eq(0)).to.be.true;
    const rewardsAtP4ForT1P3 = await snookGame.computeRewards(1, 3);
    const budgetP3 = await snookGame.getPeriodBudget(3);
    expect(rewardsAtP4ForT1P3.eq(budgetP3)).to.be.true;
    

  });

  it.skip('tests scenario 2: playing between two periods', async ()=>{

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
      2,
      2,
      2
    ];
    await treasury.initialize(payees,shares,cycles);
    

    // started period 1
    await treasury.transfer();    
    const snookPrice1 = await uniswap.getSnookPriceInSkills();
    await skillToken.connect(signers[1]).approve(snookGame.address, snookPrice1);
    await snookGame.mint(signers[1].address, 0, 0, 0, 'minted with 0 star');
    
    const snookPrice2 = await uniswap.getSnookPriceInSkills();
    await skillToken.connect(signers[2]).approve(snookGame.address, snookPrice2);
    await snookGame.mint(signers[2].address, 0, 0, 0, 'minted with 0 stars');
    
    await delay(2.1*1000);
    // ended period 1


    // started period 2
    await skillToken.transfer(treasury.address, startBalance); 
    await treasury.transfer();
    await snookGame.connect(signers[1]).allowGame(1);
    await snookGame.connect(signers[2]).allowGame(2);
    await snookGame.enterGame(1, 0);
    await snookGame.enterGame(2, 0);
    await snookGame.extractSnook(1, 0, 4, 0, 'now 4 stars');
    await snookGame.extractSnook(2, 0, 8, 0, 'now 8 stars');

    await snookGame.connect(signers[1]).allowGame(1);
    await snookGame.connect(signers[2]).allowGame(2);
    await snookGame.enterGame(1, 0);
    await snookGame.enterGame(2, 0);
    await snookGame.extractSnook(1, 0, 3, 0, 'now 3 stars');
       
    await delay(2.1*1000);
    // ended period 2

    // started period 3
    await skillToken.transfer(treasury.address, startBalance); 
    await treasury.transfer(); 
    await snookGame.extractSnook(2, 0, 7, 0, 'now 7 stars');
    await delay(2.1*1000);
    // ended period 3
    
    // started period 4
    await skillToken.transfer(treasury.address, startBalance); 
    await treasury.transfer();

    const rewardsAtP4ForT2P3 = await snookGame.computeRewards(2,3);
    const budgetP3 = await snookGame.getPeriodBudget(3);
    expect(rewardsAtP4ForT2P3.eq(
      budgetP3.mul(7).div(10)
    ));

    const rewardsAtP4ForT2P2 = await snookGame.computeRewards(2,2);
    const budgetP2 = await snookGame.getPeriodBudget(2);
    expect(rewardsAtP4ForT2P2.eq(
      budgetP2.mul(8).div(11)
    ));

    const rewardsAtP4ForT1P3 = await snookGame.computeRewards(1,3);
    expect(rewardsAtP4ForT1P3.eq(
      budgetP3.mul(3).div(10)
    ));

    const rewardsAtP4ForT1P2 = await snookGame.computeRewards(1,2);
    expect(rewardsAtP4ForT1P2.eq(
      budgetP2.mul(3).div(11)
    ));

    await snookGame.connect(signers[1]).allowGame(1);
    await snookGame.enterGame(1, 0);
    await snookGame.extractSnook(1, 0, 6, 0, 'now 6 stars');
    await delay(2.1*1000);
    // ended period 4
    

  });

});
