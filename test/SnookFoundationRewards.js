const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SnookFoundationRewards", function() {
  const initialSkillSupply = 40000000;
  let skillToken;  
  let treasury;
  let signers;
  let SFRBeneficiary;
  const TreasuryBalance = ethers.utils.parseEther('1000');
  const SFRPercentage = 10;
  beforeEach(async ()=>{
    signers = await ethers.getSigners();
    
    const SkillToken = await ethers.getContractFactory('SkillToken');
    skillToken = await SkillToken.deploy(initialSkillSupply);
    await skillToken.deployed();
    
    SFRBeneficiary = signers[1].address;
    
    const Treasury = await ethers.getContractFactory('Treasury');
    treasury = await Treasury.deploy(
      skillToken.address,
      [signers[1].address],
      [SFRPercentage],
      [5]
    );
    await treasury.deployed();
    
    // Tap up treasury balance
    await skillToken.transfer(treasury.address, TreasuryBalance);
    await treasury.allocate();

  });

  it('tests balance of snook foundation after allocation', async ()=>{
    expect(
      await skillToken.balanceOf(SFRBeneficiary)
    ).to.equal(TreasuryBalance.mul(SFRPercentage).div(100));
  });

});
