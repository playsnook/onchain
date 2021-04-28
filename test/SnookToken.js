const { expect } = require("chai");

describe("Game flow", function() {

  let snookToken;
  let skillToken;
  let signers; 
  const startBalance = 1000;

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
    console.log(`Signer 1: ${signers[1].address}`);
    console.log(`Signer 2: ${signers[2].address}`);
    // tap up Skill balances of signers
    await skillToken.transfer(signers[1].address, startBalance); 
    await skillToken.transfer(signers[2].address, startBalance); 

  });

  it('Flow #1', async ()=>{
    const totalSupply1 = (await skillToken.totalSupply()).toNumber()
    const snookPrice = (await snookToken.SNOOK_PRICE()).toNumber();
    
    // gamer 1 approves paying snook price
    await skillToken.connect(signers[1]).approve(snookToken.address, snookPrice);
    // gamer 1 requests minting
    await snookToken.connect(signers[1]).requestMint();
    
    // gamer 1 request another minting before the first is finished and reverted
    await expect(
      snookToken.connect(signers[1]).requestMint()
    ).to.be.revertedWith('Previous minting is in progress');
    
    // gamer 2 who did not approved paying, requests minting and reverted
    await expect(
      snookToken.connect(signers[2]).requestMint()
    ).to.be.reverted;

    // contract owner asks who are mint requesters and get user 1
    expect(
      await snookToken.getMintRequesters()
    ).to.include(signers[1].address);
    
    // contract owner mints to user 1
    await snookToken.mint(signers[1].address, [1], 'test');

    const totalSupply2 = (await skillToken.totalSupply()).toNumber();
    // during minting total supply of skill token decreases by snook price
    expect(totalSupply1).to.be.equal(totalSupply2 + snookPrice);

    // user 1's balance is decreased by snook price
    expect(
      await skillToken.balanceOf(signers[1].address)
    ).to.be.equal(startBalance - snookPrice);

    // user 1 enters the game with minted token 1
    await expect(
      snookToken.connect(signers[1]).enterGame(1)
    ).to.emit(snookToken, 'Entrance').withArgs(signers[1].address, 1);

    // user 1 tries to send locked token to user 2 and reverted
    await expect(
      snookToken.connect(signers[1]).transferFrom(signers[1].address, signers[2].address, 1)
    ).to.be.revertedWith('Token is locked');

    // user 1 tries to extract the snook by itself
    await expect(
      snookToken.connect(signers[1]).extractFromGame(1, [1,2,3], 'myfake')
    ).to.be.revertedWith('Ownable: caller is not the owner')

    // user 1 tries to enter the game with the same snook
    await expect(
      snookToken.connect(signers[1]).enterGame(1)
    ).to.be.revertedWith('Snook is already in play')

    // contract owner tries to move snook 1 to itself (steal it) and fails
    await expect(
      snookToken.transferFrom(signers[1].address, signers[0].address, 1)
    ).to.be.revertedWith('ERC721: transfer caller is not owner nor approved');

    // user 1 approves transfer rights to user 2
    // WARNING: maybe we need to revert this when token is locked?
    await expect(
      snookToken.connect(signers[1]).approve(signers[2].address, 1)
    ).to.emit(snookToken, 'Approval').withArgs(signers[1].address, signers[2].address, 1)
    
    // // user 2 tries to transfer snook 1 to user 2 (itself) and fails
    await expect(
      snookToken.connect(signers[2]).transferFrom(signers[1].address, signers[2].address, 1)
    ).to.be.revertedWith('Token is locked')

    // WS gets notification from GS to extract snook
    // contract owner extracts snook of gamer 1
    await expect(
      snookToken.extractFromGame(1, [1,2], 'extracted')
    ).to.emit(snookToken, 'Extraction').withArgs(signers[1].address, 1);

    // gamer 1 sends snook 1 to gamer 2 which succeeds as token was extracted
    await expect(
      snookToken.connect(signers[1]).transferFrom(signers[1].address, signers[2].address, 1)
    ).to.emit(snookToken, 'Transfer').withArgs(signers[1].address, signers[2].address, 1);

    // gamer 2 enters the game with snook 1
    await expect(
      snookToken.connect(signers[2]).enterGame(1)
    ).to.emit(snookToken, 'Entrance').withArgs(signers[2].address, 1);

    // gamer 2 dies in the game
    await expect(
      snookToken.setDeathTime(1, [1], 'reserect')
    ).to.emit(snookToken, 'Death').withArgs(signers[2].address, 1);

    const { ressurectionPrice } = await snookToken.connect(signers[2].address).describe(1);
    console.log(ressurectionPrice.toNumber());

    // gamer 2 tries to ressurect without paying
    await expect(
      snookToken.connect(signers[2]).ressurect(1)
    ).to.be.revertedWith('ERC20: transfer amount exceeds allowance');

    // gamer 2 tries to move dead token to gamer 1
    await expect(
      snookToken.connect(signers[2]).transferFrom(signers[2].address, signers[1].address, 1)
    ).to.be.revertedWith('Token is locked');

    // gamer 2 allows to pay ressurection price
    await skillToken.connect(signers[2]).approve(snookToken.address, ressurectionPrice.toNumber());
    // ... and ressurects
    await expect(
      snookToken.connect(signers[2]).ressurect(1)
    ).to.emit(snookToken, 'Ressurection').withArgs(signers[2].address, 1);

  });

});
