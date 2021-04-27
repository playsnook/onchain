const { expect } = require("chai");

describe("Game flow", function() {

  let snookToken;
  let skillToken;
  let signers; 

  before(async ()=>{
    const SkillToken = await ethers.getContractFactory('SkillToken');
    skillToken = await SkillToken.deploy();
    await skillToken.deployed();
    console.log(`skill contract: ${skillToken.address}`);
    

    const SnookToken = await ethers.getContractFactory('SnookToken');
    snookToken = await SnookToken.deploy(skillToken.address);
    await snookToken.deployed();
    console.log(`snookToken: ${snookToken.address}`);
    await skillToken.grantRole(await skillToken.BURNER_ROLE(), snookToken.address)
    

    signers = await ethers.getSigners();
    console.log(`Owner of contracts: ${signers[0].address}`)
    // tap up Skill balances of signers
    await skillToken.transfer(signers[1].address, 1000); 
  });

  it('Minting flow', async ()=>{
    await skillToken.connect(signers[1]).approve(snookToken.address, 10);
    await snookToken.connect(signers[1]).requestMint();
    
    await expect(
      snookToken.connect(signers[1]).requestMint()
    ).to.be.revertedWith('Previous minting is in progress');
    
    await expect(
      snookToken.connect(signers[2]).requestMint()
    ).to.be.reverted;

    expect(
      await snookToken.getMintRequesters()
    ).to.include(signers[1].address);
    
    await snookToken.mint(signers[1].address, [1], 'test');
  });

});
