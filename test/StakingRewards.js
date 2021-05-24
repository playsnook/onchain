const { expect } = require("chai");
const { ethers } = require("hardhat");
const delay = require('delay');
const moment = require('moment');
const _ = require('lodash');

describe("StakingRewards", function() {

  let skillToken;  
  let treasury;
  let signers;
  let stakingRewards;
  let initialSkillSupply; // in SKILLs
  const TreasuryBalance = ethers.utils.parseEther('1000');
  const SRPercentage = 10;
  const SRBudget = TreasuryBalance.mul(SRPercentage).div(100);
  let TokenTimelock;
  const minStakingPeriod = 2;
  const maxStakingPeriod = 5;
  const minNumberOfStakers = 2;
  const minStakingValueCoef = 1000;
  const interestRate = 10; // in nanopercents
  const burningRate = 1; // in percents
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
      interestRate,
      ethers.utils.parseEther(initialSkillSupply.toString()),
      minStakingValueCoef,
      burningRate
    );
    await stakingRewards.deployed();
    await skillToken.grantRole(await skillToken.BURNER_ROLE(), stakingRewards.address);

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

  it('checks deposit() reverts on uninitialzed cycle', async ()=>{
    // revert without initialization
    await expect(
      stakingRewards.connect(signers[1]).deposit(1, 1)
    ).to.be.revertedWith('Reward cycle is not initialized');

    // initialize
    await stakingRewards.init();
    // wait for expiration of the reward cycle
    await delay(1.2*maxStakingPeriod*1000);
    //revert depositing after the cycle expired
    await expect(
      stakingRewards.connect(signers[1]).deposit(1, minStakingPeriod)
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

  it('tests deposit limit calculation by contract', async ()=>{
    await stakingRewards.init();
    const [cmin, cmax] = await stakingRewards.getDepositLimits();
    // calculate expected cmax value
    const S = await skillToken.totalSupply();
    const S0 = ethers.utils.parseEther(initialSkillSupply.toString());
    console.log(`S=${S}, S0=${S0}`);
    const peMul10P11 = S.div(S0).mul(interestRate);  
    let cmaxExpected = SRBudget.div(peMul10P11).mul(Math.pow(10,11)).div(maxStakingPeriod).div(minNumberOfStakers);
    if (cmaxExpected > SRBudget) {
      cmaxExpected = SRBudget;
    }
    expect(cmax).to.equal(cmaxExpected);
    const cminExpected = cmaxExpected.div(minStakingValueCoef);
    expect(cmin).to.equal(cminExpected);
    console.log(`cmax=${cmax}, cmin=${cmin}`);
  });

  it('checks deposit() reverts on invalid staking period', async ()=>{
    await stakingRewards.init();
    // two short period
    await expect(
      stakingRewards.connect(signers[1]).deposit(1, minStakingPeriod-1)
    ).to.be.revertedWith('Invalid staking period');
    // two long period
    await expect(
      stakingRewards.connect(signers[1]).deposit(1, maxStakingPeriod+1)
    ).to.be.revertedWith('Invalid staking period');
  });

  it('checks deposit reverts on invalid staking amount', async ()=>{
    await stakingRewards.init();
    const [cmin, cmax] = await stakingRewards.getDepositLimits();
    await expect(
      stakingRewards.connect(signers[1]).deposit(cmax.mul(2), minStakingPeriod)
    ).to.be.revertedWith('Invalid staking amount');
    await expect(
      stakingRewards.connect(signers[1]).deposit(cmin.div(2), minStakingPeriod)
    ).to.be.revertedWith('Invalid staking amount');
  });

  it('checks deposit reverts on insufficient budget of staker', async ()=>{
    await stakingRewards.init();
    const [cmin, cmax] = await stakingRewards.getDepositLimits();
    console.log(`signer: ${signers[1].address}, cmin: ${ethers.utils.formatEther(cmin.toString())}`);
    expect(await skillToken.balanceOf(signers[1].address)).to.equal(0);
    await expect(
      stakingRewards.connect(signers[1]).deposit(cmin, minStakingPeriod)
    ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
  });

  it('checks deposit reward values', async ()=>{
    await stakingRewards.init();
    const [ cmin ] = await stakingRewards.getDepositLimits();
    
    // tap minimal staking amount to staker 1
    await skillToken.transfer(signers[1].address, cmin);
    const depositAmount = cmin;
    await skillToken.connect(signers[1]).approve(stakingRewards.address, depositAmount);
    const S = await skillToken.totalSupply();
    const S0 = ethers.utils.parseEther(initialSkillSupply.toString());

    const rewards = depositAmount
      .mul(S)
      .mul(interestRate)
      .mul(minStakingPeriod)
      .div(Math.pow(10,9))
      .div(100)
      .div(S0);
      
    const rewardsToBurn = rewards.mul(burningRate).div(100);
    const rewardsToPay = rewards.sub(rewardsToBurn);
    const expectedDepositWithRewards = depositAmount.add(rewardsToPay);

    const tx = await stakingRewards.connect(signers[1]).deposit(cmin, minStakingPeriod);
    const r = await tx.wait();
    expect(r).to.have.property('events');
    expect(r.events).to.be.an('array');
    const eventDeposit = r.events.find(e => e.event === 'Deposit');
    expect(eventDeposit).to.be.an('object').and.have.property('args');
    const { beneficiary, tokenTimelock: lockaddr } = eventDeposit.args;
    expect(beneficiary).to.be.equal(signers[1].address);
    const tokenTimelock = await TokenTimelock.attach(lockaddr);
    
    await expect(
      tokenTimelock.release()
    ).to.be.revertedWith('TokenTimelock: current time is before release time');
    await delay(1.1*minStakingPeriod*1000);

    await expect(
      tokenTimelock.release()
    ).to.not.be.reverted;

    const balance = await skillToken.balanceOf(signers[1].address);
    expect(balance).to.be.equal(expectedDepositWithRewards);    
  });
});
