const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SnookFoundationRewards", function() {

  let skillToken;  
  let treasury;
  let snookFoundationRewards;
  let signers;
  beforeEach(async ()=>{
    signers = await ethers.getSigners();
    console.log(`Owner of contracts: ${signers[0].address}`)
    console.log(`Signer 1: ${signers[1].address}`);
    console.log(`Signer 2: ${signers[2].address}`);

    const SkillToken = await ethers.getContractFactory('SkillToken');
    skillToken = await SkillToken.deploy();
    await skillToken.deployed();
    console.log('skill token deployed')

    const SnookFoundationRewards = await ethers.getContractFactory('SnookFoundationRewards');
    snookFoundationRewards = await SnookFoundationRewards.deploy(
      skillToken.address,
      signers[0].address,
      3
    );
    await snookFoundationRewards.deployed();
    console.log('snookFoundationRewards deployed');

    const Treasury = await ethers.getContractFactory('Treasury');
    treasury = await Treasury.deploy(
      skillToken.address,
      [snookFoundationRewards.address],
      [10],
      [5]
    );
    await treasury.deployed();
    console.log('treasury deployed');

    // Tap up treasury balance
    const TreasuryBalance = ethers.utils.parseEther('1000');
    await skillToken.transfer(treasury.address, TreasuryBalance);
    await treasury.allocate();
  });

  it('tests timelock', async ()=>{
    await expect(
      snookFoundationRewards.timelockRewards()
    ).to.emit(skillToken, 'Transfer');
    const tokenTimelock = await snookFoundationRewards.tokenTimelock();
    // how to call on this address?
  });

});
