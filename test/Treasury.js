const { expect } = require("chai");
const moment = require('moment');
const { ethers } = require("hardhat");

describe("Treasury", function() {

  let skillToken;  
  let treasury;
  let snookFoundationRewards;
  let specialSkinRewards;
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

    const SpecialSkinRewards = await ethers.getContractFactory('SpecialSkinRewards');
    specialSkinRewards = await SpecialSkinRewards.deploy();
    await specialSkinRewards.deployed();

    const SnookFoundationRewards = await ethers.getContractFactory('SnookFoundationRewards');
    snookFoundationRewards = await SnookFoundationRewards.deploy(
      skillToken.address, 
      signers[1].address
    );
    await snookFoundationRewards.deployed();
    console.log('snookFoundationRewards deployed');

    const Treasury = await ethers.getContractFactory('Treasury');
    treasury = await Treasury.deploy(
      skillToken.address,
      specialSkinRewards.address,
      snookFoundationRewards.address,
      7,
      10
    );
    await treasury.deployed();

    // Tap up treasury balance
    const TreasuryBalance = ethers.utils.parseEther('1000');
    const balance = await skillToken.balanceOf(signers[0].address);
    console.log(`balance: ${balance.toString()}, TreasuryBalance: ${TreasuryBalance}`);
    await skillToken.transfer(treasury.address, TreasuryBalance);
    

  });

  it('SnookFoundationRewards', async ()=>{
    await treasury.allocate();
  });

});
