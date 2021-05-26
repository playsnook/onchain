const { expect } = require("chai");
const { ethers } = require("hardhat");
const delay = require('delay');

describe.skip("Treasury", function() {

  let skillToken;  
  let treasury;
  let signers;
  beforeEach(async ()=>{
    signers = await ethers.getSigners();
    const SkillToken = await ethers.getContractFactory('SkillToken');
    skillToken = await SkillToken.deploy(40000000);
    await skillToken.deployed();
    Treasury = await ethers.getContractFactory('Treasury');
    treasury = await Treasury.deploy(skillToken.address);
    await treasury.deployed();
  });

  it('tests upsert', async ()=>{
    await treasury.upsert(signers[1].address, 50, 1);
    await expect(
      treasury.upsert(signers[2].address, 53, 1)
    ).to.be.revertedWith('Invalid percentage');
  });

  it('tests remove', async ()=>{
    await treasury.upsert(signers[1].address, 50, 1);
    await expect(
      treasury.remove(signers[2].address)
    ).to.be.revertedWith('No such allocatee');

    await expect(
      treasury.remove(signers[1].address)
    ).to.be.not.reverted;
  });

  it('tests allocation percentages', async ()=>{
    
    await treasury.upsert(signers[1].address, 60, 1);
    await treasury.upsert(signers[2].address, 40, 1);
    
    const TreasuryBalance = ethers.utils.parseEther('1000');
    await expect(
      skillToken.transfer(treasury.address, TreasuryBalance)
    ).to.emit(skillToken, 'Transfer')
    .withArgs(signers[0].address, treasury.address, TreasuryBalance);    
    await treasury.allocate();
    const balance1 = await skillToken.balanceOf(signers[1].address);
    const balance2 = await skillToken.balanceOf(signers[2].address);
    expect(balance1.add(balance2)).to.equal(TreasuryBalance);
    expect(await skillToken.balanceOf(treasury.address)).to.equal(0);
  });

  it('tests allocation time periodicities', async ()=>{
    
    await treasury.upsert(signers[1].address, 10, 5);

    const TreasuryBalance = ethers.utils.parseEther('1000');
    await expect(
      skillToken.transfer(treasury.address, TreasuryBalance)
    ).to.emit(skillToken, 'Transfer')
    .withArgs(signers[0].address, treasury.address, TreasuryBalance);

    // allocate transfers funds from treasury to allocatee
    await expect(
      treasury.allocate()
    ).to.emit(skillToken, 'Transfer');

    // next allocate cannot be done before 5 secs
    await expect(
      treasury.allocate()
    ).to.not.emit(skillToken, 'Transfer');

    // lets wait 6 secs
    await delay(6*1000);
    
    // now allocate should work
    await expect(
      treasury.allocate()
    ).to.emit(skillToken, 'Transfer');

  });
});
