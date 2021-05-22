const { expect } = require("chai");
const { ethers } = require("hardhat");
const delay = require('delay');
const moment = require('moment');

describe("StakingRewards", function() {

  let skillToken;  
  let treasury;
  let signers;
  let stakingRewards;
  const gamersBalance = ethers.utils.parseEther('100');
  const TreasuryBalance = ethers.utils.parseEther('1000');
  const SRPercentage = 10;
  const SRBudget = TreasuryBalance.mul(SRPercentage).div(100);
  let TokenTimelock;
  const minStakingPeriod = 2;
  const maxStakingPeriod = 5;
  const minNumberOfStakers = 2;
  const dailyInterestRate = 10; 

  beforeEach(async ()=>{
    TokenTimelock = await ethers.getContractFactory("TokenTimelock");

    signers = await ethers.getSigners();
    
    const SkillToken = await ethers.getContractFactory('SkillToken');
    skillToken = await SkillToken.deploy();
    await skillToken.deployed();
    const initialSkillSupply = await skillToken.INITIAL_SUPPLY();

    const StakingRewards = await ethers.getContractFactory('StakingRewards');
    stakingRewards = await StakingRewards.deploy(
      skillToken.address,
      minStakingPeriod,
      maxStakingPeriod,
      minNumberOfStakers,
      dailyInterestRate,
      initialSkillSupply
    );
    await stakingRewards.deployed();
    
    // stakers
    await skillToken.transfer(signers[1].address, gamersBalance);
    await skillToken.transfer(signers[2].address, gamersBalance);

    const Treasury = await ethers.getContractFactory('Treasury');
    treasury = await Treasury.deploy(
      skillToken.address,
      [stakingRewards.address],
      [SRPercentage],
      [5]
    );
    await treasury.deployed();
    
    // Tap up treasury balance
    await skillToken.transfer(treasury.address, TreasuryBalance);
    await treasury.allocate();
    
  });

  it('tests deposit() reverts on uninitialzed cycle', async ()=>{
    await expect(
      stakingRewards.connect(signers[1]).deposit(1, 1)
    ).to.be.revertedWith('Reward cycle is not initialized');
  });


  it('checks staking rewards init reverts while previous cycle is in progress', async ()=>{
    // start first cycle
    await stakingRewards.init();
    await expect(
      stakingRewards.init()
    ).to.be.revertedWith('Previous reward cycle is in progress');

    // wait until previous cycle 
    await delay(5.1*1000);
    await expect(
      stakingRewards.init()
    ).to.be.not.reverted;
  });

  it('checks deposit() reverts on invalid staking period', async ()=>{
    await stakingRewards.init();
    // two short period
    await expect(
      stakingRewards.deposit(1, minStakingPeriod-1)
    ).to.be.revertedWith('Invalid staking period');
    // two long period
    await expect(
      stakingRewards.deposit(1, maxStakingPeriod+1)
    ).to.be.revertedWith('Invalid staking period');
  });

  it('test deposit limits', async ()=>{
    await stakingRewards.init();
    const [cmin, cmax] = await stakingRewards.getDepositLimits();
    // calculate expected cmax value
    
    const cmaxe = SRBudget / maxStakingPeriod; 

  });
});
