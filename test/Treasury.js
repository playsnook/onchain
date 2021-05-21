const { expect } = require("chai");
const { ethers } = require("hardhat");
const delay = require('delay');

describe.skip("Treasury", function() {

  let skillToken;  
  let Treasury;
  let signers;
  beforeEach(async ()=>{
    signers = await ethers.getSigners();
    const SkillToken = await ethers.getContractFactory('SkillToken');
    skillToken = await SkillToken.deploy();
    await skillToken.deployed();
    Treasury = await ethers.getContractFactory('Treasury');

  });

  it('tests deployment', async ()=>{
    await expect(
      Treasury.deploy(
        skillToken.address,
        // for tests only; should be contract addresses
        [ signers[1].address, signers[2].address], 
        [10],
        [1]
      )
    ).to.be.revertedWith('Invalid dimensions');
    
    await expect(
      Treasury.deploy(
        skillToken.address,
        // for tests only; should be contract addresses
        [ signers[1].address, signers[2].address], 
        [10,100],
        [1,1]
      )
    ).to.be.revertedWith('Invalid percentages');
  });

  it('tests allocation percentages', async ()=>{
    const treasury = await Treasury.deploy(
      skillToken.address,
      [ signers[1].address, signers[2].address ], 
      [ 60,40 ],
      [ 1, 1 ] 
    );
    await treasury.deployed();

    const TreasuryBalance = ethers.utils.parseEther('1000');
    await expect(
      skillToken.transfer(treasury.address, TreasuryBalance)
    ).to.emit(skillToken, 'Transfer')
    .withArgs(signers[0].address, treasury.address, TreasuryBalance);
    
    await treasury.allocate();
    const balance1 = await skillToken.balanceOf(signers[1].address);
    const balance2 = await skillToken.balanceOf(signers[2].address);
    expect(balance1.add(balance2)).to.equal(TreasuryBalance);
  });

  it('tests allocation time periodicities', async ()=>{
    const treasury = await Treasury.deploy(
      skillToken.address,
      [ signers[1].address ], 
      [ 10 ],
      [ 5 ] // sec 
    );
    await treasury.deployed();

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
