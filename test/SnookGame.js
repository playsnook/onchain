const { expect } = require("chai");
const moment = require('moment');
const delay = require('delay');
const UniswapV2FactoryArtifact = require('@uniswap/v2-core/build/UniswapV2Factory.json');
const UniswapV2Router02Artifact = require('@uniswap/v2-periphery/build/UniswapV2Router02.json');
const { ethers } = require("hardhat");

describe("SnookGame contract", function() {

  let snookToken;
  let skillToken;
  let uniswap;
  let signers; 
  let snookGame;
  let treasury;
  const startBalance = ethers.utils.parseEther('1000');
  const initialSkillSupply = 40000000;
  const BurialDelay = 5;
  beforeEach(async ()=>{

    signers = await ethers.getSigners();
    console.log(`Owner of contracts: ${signers[0].address}`)
    console.log(`Signer 1: ${signers[1].address}`);
    console.log(`Signer 2: ${signers[2].address}`);

    const SkillToken = await ethers.getContractFactory('SkillToken');
    skillToken = await SkillToken.deploy(initialSkillSupply);
    await skillToken.deployed();
    console.log('skill token deployed')

    const UsdcToken = await ethers.getContractFactory('UsdcToken');
    const usdcToken = await UsdcToken.deploy();
    await usdcToken.deployed();
    console.log('usdc token deployed')
    
    const UniswapV2Factory = await ethers.getContractFactory(
      UniswapV2FactoryArtifact.abi,
      UniswapV2FactoryArtifact.bytecode
    );
    const uniswapV2Factory = await UniswapV2Factory.deploy(signers[0].address);
    await uniswapV2Factory.deployed();
    console.log('uniswap factory deployed')

    const UniswapV2Router02 = await ethers.getContractFactory(
      UniswapV2Router02Artifact.abi,
      UniswapV2Router02Artifact.bytecode
    );
    const uniswapV2Router02 = await UniswapV2Router02.deploy(uniswapV2Factory.address, signers[0].address);
    await uniswapV2Router02.deployed();
    console.log('uniswap router deployed');
      
    await usdcToken.approve(uniswapV2Router02.address, ethers.utils.parseEther('10000'));
    await skillToken.approve(uniswapV2Router02.address, ethers.utils.parseEther('10000'));
    
    await uniswapV2Factory.createPair(usdcToken.address, skillToken.address);
    await uniswapV2Router02.addLiquidity(
      usdcToken.address,
      skillToken.address,
      ethers.utils.parseEther('250'),
      ethers.utils.parseEther('1000'),
      ethers.utils.parseEther('249'),
      ethers.utils.parseEther('999'),
      signers[0].address,
      moment().add(30, 'seconds').unix()
    );
    console.log('Liquidity added')

    const Uniswap = await ethers.getContractFactory('UniswapUSDCSkill');
    uniswap = await Uniswap.deploy(uniswapV2Factory.address, usdcToken.address, skillToken.address);
    await uniswap.deployed();
    const k = await uniswap.getSnookPriceInSkills();
    console.log('k=', ethers.utils.formatEther(k))

    const SnookToken = await ethers.getContractFactory('SnookToken');
    snookToken = await SnookToken.deploy();
    await snookToken.deployed();
    console.log(`snookToken deployed`);

    const Treasury = await ethers.getContractFactory('Treasury');
    treasury = await Treasury.deploy(skillToken.address);
    await treasury.deployed();
    console.log('Treasury deployed');

    const SnookGame = await ethers.getContractFactory('SnookGame');
    snookGame = await SnookGame.deploy(
      snookToken.address, 
      skillToken.address, 
      uniswap.address,
      treasury.address,
      BurialDelay
    );
    await snookGame.deployed();
    console.log(`snookGame deployed`);

    await skillToken.grantRole(await skillToken.BURNER_ROLE(), snookGame.address);
    console.log(`SkillToken granted BURNER role to SnookGame contract`);

    await snookToken.grantRole(await snookToken.MINTER_ROLE(), snookGame.address);
    console.log('SnookToken granted MINTER role to SnookGame contract');

    // tap up Skill balances of signers
    await skillToken.transfer(signers[1].address, startBalance); 
    await skillToken.transfer(signers[2].address, startBalance); 
    console.log(`Tapped account balances up to ${startBalance}`);

    // tap up Skill balance of treasury
    await skillToken.transfer(treasury.address, startBalance); 

  });

  it.skip('Bury process without ressurection', async () => {

    let snookPrice = await uniswap.getSnookPriceInSkills();
    
    // A gamer buys a snook, plays and dies
    await skillToken.connect(signers[1]).approve(snookGame.address, snookPrice);
    await snookGame.mint(signers[1].address, 1, 0, 0, 'tokenURI');
    await snookGame.connect(signers[1]).allowGame(1);
    await snookGame.enterGame(1);
    await snookGame.setDeathTime(1, 1, 1, 1, 'ressurect');
    
    // no ressurection occurs during burial delay
    await delay(BurialDelay*1000);

    // A gamer buys another snook, plays and dies
    snookPrice = await uniswap.getSnookPriceInSkills();
    await skillToken.connect(signers[1]).approve(snookGame.address, snookPrice);
    await snookGame.mint(signers[1].address, 1, 0, 0, 'tokenURI');
    await snookGame.connect(signers[1]).allowGame(2);
    await snookGame.enterGame(2);
    await snookGame.setDeathTime(2, 1, 1, 1, 'ressurect');

    // Bury function tries to bury snooks in morgue and succeeds only with 
    // 1st token, the second survives in sanctuary
    await expect(
      snookGame.bury(10)
    ).to.emit(snookGame, 'Bury').withArgs(1);

    // No ressurection for the second token during delay
    await delay((1 + BurialDelay) * 1000);

    // Bury function buries the second token
    await expect(
      snookGame.bury(10)
    ).to.emit(snookGame, 'Bury').withArgs(1);
  });


  it.skip('Bury process with ressurection and treasury balance', async () => {

    let snookPrice = await uniswap.getSnookPriceInSkills();
    
    // A gamer buys a snook, plays and dies
    await skillToken.connect(signers[1]).approve(snookGame.address, snookPrice);
    await snookGame.mint(signers[1].address, 1, 0, 0, 'tokenURI');
    await snookGame.connect(signers[1]).allowGame(1);
    await snookGame.enterGame(1);
    await snookGame.setDeathTime(1, 1, 1, 1, 'ressurect');

    // treasure balance before ressurection
    const treasuryBalance1 = await skillToken.balanceOf(treasury.address);

    // User ressurects snook
    const { ressurectionPrice } = await snookGame.connect(signers[1].address).describe(1);
    await skillToken.connect(signers[1]).approve(snookGame.address, ressurectionPrice);
    await expect(
      snookGame.connect(signers[1]).ressurect(1)
    ).to.emit(snookGame, 'Ressurection').withArgs(signers[1].address, 1);

    // treasure balance after ressurection
    const treasuryBalance2 = await skillToken.balanceOf(treasury.address);
    expect(treasuryBalance1).to.equal(treasuryBalance2.sub(ressurectionPrice));

    // Bury has nothing to bury
    await expect(
      snookGame.bury(10)
    ).to.emit(snookGame, 'Bury').withArgs(0);

  });

  it('tests ressurection price for a single snook with 1 trait', async ()=>{
    const snookPrice = await uniswap.getSnookPriceInSkills();
    await skillToken.connect(signers[1]).approve(snookGame.address, snookPrice);
    await snookGame.mint(signers[1].address, 1, 0, 0, 'tokenURI');
    
    await snookGame.connect(signers[1]).allowGame(1);
    await snookGame.enterGame(1);
    
    
    await snookGame.setDeathTime(1,1,0,0,'test');
    const { ressurectionPrice } = await snookGame.describe(1);
    
    const rpEthersFloat = parseFloat(ethers.utils.formatEther(ressurectionPrice));
    const rpEthersFixed = rpEthersFloat.toFixed(2);
    

    // precalculation, need to know algo
    const expectedS = 1;
    const expectedTraits = 1; 
    const difficulty = Math.exp(expectedS) * expectedTraits*expectedTraits;
    const snookPriceInSkills = 1; // in ethers
    const expectedRP = snookPriceInSkills * difficulty;
    expect(expectedRP.toFixed(2)).to.equal(rpEthersFixed);

  });

  it('tests ressurection price for a single snook with 2 traits', async ()=>{
    const snookPrice = await uniswap.getSnookPriceInSkills();
    await skillToken.connect(signers[1]).approve(snookGame.address, snookPrice);
    await snookGame.mint(signers[1].address, 2, 0, 0, 'tokenURI');

    const result1 = await snookGame.getTraitHist();
    console.log('Result after mint:', result1);
    
    await snookGame.connect(signers[1]).allowGame(1);
    await snookGame.enterGame(1);
    
    await snookGame.setDeathTime(1,1,0,0,'test');
    const { ressurectionPrice } = await snookGame.describe(1);
    
    const rpEthersFloat = parseFloat(ethers.utils.formatEther(ressurectionPrice));
    const rpEthersFixed = rpEthersFloat.toFixed(2);

    // precalculation, need to know algo
    const expectedS = 1; // only one snook with 2 traits
    const expectedTraits = 2; 
    const difficulty = Math.exp(expectedS) * expectedTraits*expectedTraits;
    const snookPriceInSkills = 1; // in ethers
    const expectedRP = snookPriceInSkills * difficulty;
    expect(expectedRP.toFixed(2)).to.equal(rpEthersFixed);

  });

  it.skip('tests ressurection price for two snooks with 1 and 2 traits', async ()=>{
    const snookPrice1 = await uniswap.getSnookPriceInSkills();
    await skillToken.connect(signers[1]).approve(snookGame.address, snookPrice1);
    // snook with 1 trait
    await snookGame.mint(signers[1].address, 1, 0, 0, 'tokenURI');
    
    const snookPrice2 = await uniswap.getSnookPriceInSkills();
    await skillToken.connect(signers[2]).approve(snookGame.address, snookPrice2);
    // snook with 2 traits
    await snookGame.mint(signers[2].address, 2, 0, 0, 'tokenURI');
    
    await snookGame.connect(signers[1]).allowGame(1);
    await snookGame.enterGame(1);
    await snookGame.setDeathTime(1,1,0,0,'test');
 
 
    await snookGame.connect(signers[2]).allowGame(2);
    await snookGame.enterGame(2);
    await snookGame.setDeathTime(2,1,0,0,'test');
    
    const { ressurectionPrice: rp1 } = await snookGame.describe(1);
    const rp1EthersFloat = parseFloat(ethers.utils.formatEther(rp1));
    const rp1EthersFixed = rp1EthersFloat.toFixed(2);

    const { ressurectionPrice: rp2 } = await snookGame.describe(2);
    const rp2EthersFloat = parseFloat(ethers.utils.formatEther(rp2));
    const rp2EthersFixed = rp2EthersFloat.toFixed(2);
    
    // precalculation, need to know algo; should move calculation of difficulty to the test
    const s1 = 0.5; // value of S, only one snook with 2 traits
    const traits1 = 1; 
    const difficulty1 = Math.exp(s1) * traits1*traits1;
    const sp1 = 1; // snook price from uniswap in ethers
    const erp1 = sp1 * difficulty1; // expected ressurection price
    expect(erp1.toFixed(2)).to.equal(rp1EthersFixed);

    // precalculation, need to know algo
    const s2 = 1; // only one snook with 2 traits
    const traits2 = 2; 
    const difficulty2 = Math.exp(s2) * traits2*traits2;
    const sp2 = 1; // in ethers
    const erp2 = sp2 * difficulty2; // expected res price
    expect(erp2.toFixed(2)).to.equal(rp2EthersFixed);

  });

  it('tests trait hist when a single snook is minted, extracted, died and ressurected', async ()=>{
    const snookPrice = await uniswap.getSnookPriceInSkills();
    await skillToken.connect(signers[1]).approve(snookGame.address, snookPrice);
    const hist1 = await snookGame.getTraitHist();
    expect(hist1).to.have.lengthOf(0);

    // mint a snook with 1 trait
    await snookGame.mint(signers[1].address, 1, 0, 0, 'tokenURI');
    const hist2 = await snookGame.getTraitHist();
    expect(hist2).to.have.lengthOf(2);
    const hist2str = hist2.map(n=>n.toString());
    expect(hist2str).to.include.ordered.members(['0','1']);
    
    await snookGame.connect(signers[1]).allowGame(1);
    await snookGame.enterGame(1);
    // extract snook with 2 traits
    await snookGame.extractSnook(1, 2, 0,0, 'test');
    hist3 = await snookGame.getTraitHist();
    expect(hist3).to.have.lengthOf(3);
    const hist3str = hist3.map(n=>n.toString());
    expect(hist3str).to.include.ordered.members(['0','0','1']);

    await snookGame.connect(signers[1]).allowGame(1);
    await snookGame.enterGame(1);
    // snook is dead and will have 1 trait on ressurection
    await snookGame.setDeathTime(1, 1, 0, 0, 'dead');
    const hist4 = await snookGame.getTraitHist();
    const hist4str = hist4.map(n=>n.toString());
    expect(hist4str).to.include.ordered.members(['0','0','0']);
    const {ressurectionPrice} = await snookGame.describe(1);
    await skillToken.connect(signers[1]).approve(snookGame.address, ressurectionPrice);
    await snookGame.connect(signers[1]).ressurect(1);
    const hist5 = await snookGame.getTraitHist();
    const hist5str = hist5.map(n=>n.toString());
    expect(hist5str).to.have.ordered.members(['0','1','0']);
  });

  it.skip('Flow #1', async ()=>{
    const totalSupply1 = await skillToken.totalSupply();   

    // gamer 1 approves paying snook price
    const snookPrice = await uniswap.getSnookPriceInSkills();
    console.log(`price=${ethers.utils.formatEther(snookPrice)}`);
    await skillToken.connect(signers[1]).approve(snookGame.address, snookPrice);
    
    // non-minter  tries to mint snook token; 
    // here signers[0] is contract owner but not a minter, the minter is contract SnookGame.
    await expect(
      snookToken.connect(signers[0]).mint(signers[0].address, 'test')
    ).to.be.revertedWith('Caller is not a minter');

    // contract owner mints to user 1
    await snookGame.mint(signers[1].address, 1, 0, 0, 'tokenURI');
    
    // enumerate Snooks of signer1
    const signer1snookBalance = await snookToken.balanceOf(signers[1].address);
    const totalSnookSupply = await snookToken.totalSupply();
    expect(totalSnookSupply).to.be.equal(1);
    const signer1snookIds = [];
    for (let i=0; i<signer1snookBalance; i++) {
      const t = await snookToken.tokenOfOwnerByIndex(signers[1].address, i);
      signer1snookIds.push(t.toNumber())
    }
    expect(signer1snookIds).to.include(1);

    const totalSupply2 = await skillToken.totalSupply();
    console.log(`totalSupply2: ${totalSupply2}`);
    // during minting total supply of skill token decreases by snook price
    expect(totalSupply1).to.be.equal(totalSupply2.add(snookPrice));

    // user 1's balance is decreased by snook price
    expect(
      await skillToken.balanceOf(signers[1].address)
    ).to.be.equal(startBalance.sub(snookPrice));

    // contract tries to enter the snook into game without permission and fails
    await expect(
      snookGame.enterGame(1)
    ).to.be.revertedWith('Snook is not allowed for playing')

    // user 1 allows his snook 1 for playing 
    await expect(
      snookGame.connect(signers[1]).allowGame(1)
    ).to.emit(snookGame, 'GameAllowed').withArgs(signers[1].address, 1);

    // contract gets the user into the game
    await expect(
      snookGame.enterGame(1)
    ).to.emit(snookGame, 'Entry').withArgs(signers[1].address, 1);


    // user 1 tries to send locked token to user 2 and reverted
    await expect(
      snookToken.connect(signers[1]).transferFrom(signers[1].address, signers[2].address, 1)
    ).to.be.revertedWith('Token is locked');


    // user 1 tries to extract the snook by itself
    await expect(
      snookGame.connect(signers[1]).extractSnook(1, 10, 10, 10, 'myfake')
    ).to.be.revertedWith('Ownable: caller is not the owner')

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
      snookGame.extractSnook(1, 1, 1, 1, 'extracted')
    ).to.emit(snookGame, 'Extraction').withArgs(signers[1].address, 1);

    // contract tries to get the snook 1 to the game but it's not allowed after extraction
    await expect(
      snookGame.enterGame(1)
    ).to.be.revertedWith('Snook is not allowed for playing')


    // gamer 1 sends snook 1 to gamer 2 which succeeds as token was extracted
    await expect(
      snookToken.connect(signers[1]).transferFrom(signers[1].address, signers[2].address, 1)
    ).to.emit(snookToken, 'Transfer').withArgs(signers[1].address, signers[2].address, 1);
    

    // gamer 2 allows gaming
    await expect(
      snookGame.connect(signers[2]).allowGame(1)
    ).to.emit(snookGame, 'GameAllowed').withArgs(signers[2].address, 1);

    // smart contract gets him to the game
    await expect(
      snookGame.enterGame(1)
    ).to.emit(snookGame, 'Entry').withArgs(signers[2].address, 1);

    // gamer 2 dies in the game
    await expect(
      snookGame.setDeathTime(1, 1, 1, 1, 'ressurect')
    ).to.emit(snookGame, 'Death').withArgs(signers[2].address, 1);

    const { ressurectionPrice } = await snookGame.connect(signers[2].address).describe(1);
    console.log(`Resprice=${ethers.utils.formatEther(ressurectionPrice)}`);

    // gamer 2 tries to ressurect without paying
    await expect(
      snookGame.connect(signers[2]).ressurect(1)
    ).to.be.revertedWith('ERC20: transfer amount exceeds allowance');

    // gamer 2 tries to move dead token to gamer 1
    await expect(
      snookToken.connect(signers[2]).transferFrom(signers[2].address, signers[1].address, 1)
    ).to.be.revertedWith('Token is locked');

    // gamer 2 allows to pay ressurection price
    await skillToken.connect(signers[2]).approve(snookGame.address, ressurectionPrice);
    // ... and ressurects
    await expect(
      snookGame.connect(signers[2]).ressurect(1)
    ).to.emit(snookGame, 'Ressurection').withArgs(signers[2].address, 1);

    const snookPrice2 = await uniswap.getSnookPriceInSkills();
    console.log(`price=${ethers.utils.formatEther(snookPrice2)}`);

    // gamer 1 buys another snook 
    await skillToken.connect(signers[1]).approve(snookGame.address, snookPrice2);
    await expect(
      snookGame.mint(signers[1].address, 1, 1, 1, 'again')
    ).to.emit(snookGame, 'Birth').withArgs(signers[1].address, 2);
    
    // gamer 1 allows game with snook 2
    await snookGame.connect(signers[1]).allowGame(2)

    // contract gets gamer 1 into the game with snook 2
    await expect(
      snookGame.enterGame(2)
    ).to.emit(snookGame, 'Entry').withArgs(signers[1].address, 2);
    
    // gamer 2 allows the game with snook 1
    await expect(
      snookGame.connect(signers[2]).allowGame(1)
    ).to.emit(snookGame, 'GameAllowed').withArgs(signers[2].address, 1);
    
    // gamer 2 is to the game with snook 1
    await expect(
      snookGame.enterGame(1)
    ).to.emit(snookGame, 'Entry').withArgs(signers[2].address, 1);

    // emergency with game server, extract all snooks
    await snookGame.extractSnooksWithoutUpdate([1,2])
    
    // tokens are unlocked now
    expect(
      await snookToken.connect(signers[1]).isLocked(2)
    ).to.be.false;

    expect(
      await snookToken.connect(signers[2]).isLocked(1)
    ).to.be.false;

    // deployer tries to change token URI but fails as it has no minter role
    await expect(
      snookToken.setTokenURI(1, 'faked')
    ).to.be.revertedWith('Caller is not a minter');
  });

});
