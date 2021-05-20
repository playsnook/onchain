const { expect } = require("chai");
const { ethers } = require("hardhat");
const delay = require('delay');

describe("SnookFoundationRewards", function() {

  let skillToken;  
  let treasury;
  let snookFoundationRewards;
  let signers;
  let SFRBeneficiary;
  const TreasuryBalance = ethers.utils.parseEther('1000');
  const SFRRewardPercentage = 10;
  beforeEach(async ()=>{
    signers = await ethers.getSigners();
    console.log(`Owner of contracts: ${signers[0].address}`)
    console.log(`Signer 1: ${signers[1].address}`);
    console.log(`Signer 2: ${signers[2].address}`);

    const SkillToken = await ethers.getContractFactory('SkillToken');
    skillToken = await SkillToken.deploy();
    await skillToken.deployed();
    
    SFRBeneficiary = signers[1].address;
    console.log(SFRBeneficiary);
    const SnookFoundationRewards = await ethers.getContractFactory('SnookFoundationRewards');
    snookFoundationRewards = await SnookFoundationRewards.deploy(
      skillToken.address,
      SFRBeneficiary,
      3
    );
    await snookFoundationRewards.deployed();
    
    
    const Treasury = await ethers.getContractFactory('Treasury');
    treasury = await Treasury.deploy(
      skillToken.address,
      [snookFoundationRewards.address],
      [SFRRewardPercentage],
      [5]
    );
    await treasury.deployed();
    
    // Tap up treasury balance
    await skillToken.transfer(treasury.address, TreasuryBalance);
    await treasury.allocate();

    
    
  });

  it('tests timelock', async ()=>{
    await expect(
      snookFoundationRewards.timelockRewards()
    ).to.emit(skillToken, 'Transfer');
    const tokenTimelockAddress = await snookFoundationRewards.tokenTimelock();
    const TokenTimelock = await ethers.getContractFactory("TokenTimelock");
    const tokenTimelock = await TokenTimelock.attach(tokenTimelockAddress);
    await expect(
      tokenTimelock.release()
    ).to.be.revertedWith('current time is before release time');
    await delay(5.1*1000); 
    await tokenTimelock.release();
    expect(
      await skillToken.balanceOf(SFRBeneficiary)
    ).to.equal(TreasuryBalance.mul(SFRRewardPercentage).div(100));
  });

});
