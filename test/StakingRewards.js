const { expect } = require("chai");
const { ethers } = require("hardhat");
const delay = require('delay');
const moment = require('moment');

describe("StakingRewards", function() {

  let skillToken;  
  let treasury;
  let signers;
  let stakingRewards;
  let initialSkillSupply; // in SKILLs 
  const gamersBalance = ethers.utils.parseEther('100');
  const TreasuryBalance = ethers.utils.parseEther('1000');
  const SRPercentage = 10;
  const SRBudget = TreasuryBalance.mul(SRPercentage).div(100);
  let TokenTimelock;
  const minStakingPeriod = 2;
  const maxStakingPeriod = 5;
  const minNumberOfStakers = 2;
  const minStakingValueCoef = 1000;
  const dailyInterestRate = 10; // in decimals of percent, 1 = 0.1%

  beforeEach(async ()=>{
    TokenTimelock = await ethers.getContractFactory("TokenTimelock");

    signers = await ethers.getSigners();
    
    const SkillToken = await ethers.getContractFactory('SkillToken');
    skillToken = await SkillToken.deploy();
    await skillToken.deployed();
    initialSkillSupply = await skillToken.INITIAL_SUPPLY(); // in SKILLs 

    const StakingRewards = await ethers.getContractFactory('StakingRewards');
    stakingRewards = await StakingRewards.deploy(
      skillToken.address,
      minStakingPeriod,
      maxStakingPeriod,
      minNumberOfStakers,
      dailyInterestRate,
      initialSkillSupply,
      minStakingValueCoef
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

    // try to reinit before previous cycle is finished
    await delay(0.5* maxStakingPeriod * 1000);
    await expect(
      stakingRewards.init()
    ).to.be.revertedWith('Previous reward cycle is in progress');
  });

  it('checks staking rewards init is ok after previous cycle is finsihed', async ()=>{
    // start first cycle
    await stakingRewards.init();
    // wait until previous cycle is finished
    await delay(1.2* maxStakingPeriod * 1000);
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

  it('tests deposit limits', async ()=>{
    await stakingRewards.init();
    const [cmin, cmax] = await stakingRewards.getDepositLimits();
    // calculate expected cmax value
    const S = await skillToken.totalSupply();
    const S0 = ethers.utils.parseEther(initialSkillSupply.toString());
    const peMul1000 = S.div(S0).mul(dailyInterestRate);  
    const cmaxExpected = SRBudget.div(peMul1000).mul(1000).div(maxStakingPeriod).div(minNumberOfStakers);
    expect(cmax).to.equal(cmaxExpected);
    const cminExpected = cmaxExpected.div(minStakingValueCoef);
    expect(cmin).to.equal(cminExpected);

  });
});
