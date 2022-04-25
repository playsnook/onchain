require('dotenv').config();
const assert = require('assert');
const { expect } = require("chai");
const {deployments, ethers, getNamedAccounts } = require('hardhat');
const { utils: {formatEther:FE, parseUnits: PU} } = ethers;
const { getEventArgs } = require('../scripts/lib');



describe('Marketplace', function() {
  // this.timeout(600000)

  let gamer1;
  let gamer2;
  let snookPrice;
  let SnookGameGamer1;
  let SnookGameGamer2;
  let SnookTokenGamer1;
  let SnookTokenGamer2;
  let SkillTokenGamer1;
  let SkillTokenGamer2;
  let MarketplaceGamer1;
  let MarketplaceGamer2;

  beforeEach(async () => {
    await deployments.fixture(['L2']);
    ({ gamer1, gamer2 } = await getNamedAccounts());
    const UniswapUSDCSkill = await ethers.getContract('UniswapUSDCSkill');
    snookPrice = await UniswapUSDCSkill.getSnookPriceInSkills();
    
    SnookGameGamer1 = await ethers.getContract('SnookGame', gamer1);
    SnookGameGamer2 = await ethers.getContract('SnookGame', gamer2);

    SkillTokenGamer1 = await ethers.getContract('SkillToken', gamer1);
    SkillTokenGamer2 = await ethers.getContract('SkillToken', gamer2);

    SnookTokenGamer1 = await ethers.getContract('SnookToken', gamer1);
    SnookTokenGamer2 = await ethers.getContract('SnookToken', gamer2);

    MarketplaceGamer1 = await ethers.getContract('Marketplace', gamer1);
    MarketplaceGamer2 = await ethers.getContract('Marketplace', gamer2);
  
  });

  it('tests placeSnookForSale reverts when not owner of snook tries to put it for sale', async ()=>{
    await SkillTokenGamer1.approve(SnookGameGamer1.address, ethers.constants.MaxUint256);
    await SnookGameGamer1.mint2(1);
    await SnookTokenGamer1.approve(MarketplaceGamer1.address, 1);
    await expect(MarketplaceGamer2.placeSnookForSale(1, PU('1', 'ether')))
      .to.be.revertedWith('Not snook owner');
  });

  it('tests getCountOfTokensForSale() returns 1 when a single token put for sale', async ()=>{
    await SkillTokenGamer1.approve(SnookGameGamer1.address, ethers.constants.MaxUint256);
    await SnookGameGamer1.mint2(1);
    await SnookTokenGamer1.approve(MarketplaceGamer1.address, 1);
    await MarketplaceGamer1.placeSnookForSale(1, PU('1', 'ether'));
    expect(await MarketplaceGamer1.getCountOfTokensForSale()).eq(1);
  });

  it('tests token descriptor has forSale flag set to true when a token is put for sale', async ()=>{
    await SkillTokenGamer1.approve(SnookGameGamer1.address, ethers.constants.MaxUint256);
    await SnookGameGamer1.mint2(1);
    await SnookTokenGamer1.approve(MarketplaceGamer1.address, 1);
    await MarketplaceGamer1.placeSnookForSale(1, PU('1', 'ether'));
    const { forSale } = await SnookGameGamer1.describe(1);
    expect(forSale).eq(true);
  });

  it('tests token is locked when it is put for sale', async ()=>{
    await SkillTokenGamer1.approve(SnookGameGamer1.address, ethers.constants.MaxUint256);
    await SnookGameGamer1.mint2(1);
    await SnookTokenGamer1.approve(MarketplaceGamer1.address, 1);
    await MarketplaceGamer1.placeSnookForSale(1, PU('1', 'ether'));
    const isLocked = await SnookTokenGamer1.isLocked(1);
    expect(isLocked).eq(true);
  });

  it('tests token is unlocked when it is removed from sale', async ()=>{
    await SkillTokenGamer1.approve(SnookGameGamer1.address, ethers.constants.MaxUint256);
    await SnookGameGamer1.mint2(1);
    await SnookTokenGamer1.approve(MarketplaceGamer1.address, 1);
    await MarketplaceGamer1.placeSnookForSale(1, PU('1', 'ether'));
    await MarketplaceGamer1.removeSnookFromSale(1);
    const isLocked = await SnookTokenGamer1.isLocked(1);
    expect(isLocked).eq(false);
  });

  it('tests getTokensForSale() for a single token put for sale', async ()=>{
    await SkillTokenGamer1.approve(SnookGameGamer1.address, ethers.constants.MaxUint256);
    await SnookGameGamer1.mint2(1);
    await SnookTokenGamer1.approve(MarketplaceGamer1.address, 1);
    await MarketplaceGamer1.placeSnookForSale(1, PU('1', 'ether'));
    const [{
      tokenId, 
      tokenOwner,
      tokenURI,
      price,
      listedAt,
    }] = await MarketplaceGamer1.getTokensForSale(0,1);
    expect(tokenId).eq(1);
    expect(price).eq(PU('1', 'ether'));
    expect(tokenOwner).eq(gamer1);
  });

  it('tests buySnook', async ()=>{
    await SkillTokenGamer1.approve(SnookGameGamer1.address, ethers.constants.MaxInt256);
    await SnookGameGamer1.mint2(1);
    const requestedSnookPrice = PU('1', 'ether');
    await SnookTokenGamer1.approve(MarketplaceGamer1.address, 1);
    await MarketplaceGamer1.placeSnookForSale(1, requestedSnookPrice);
    const amountToSeller = await MarketplaceGamer1.getAmountToSeller(1);
    const maticBalanceGamer1 = await ethers.provider.getBalance(gamer1);
    const maticBalanceGamer2 = await ethers.provider.getBalance(gamer2);
    assert(maticBalanceGamer2.gte(requestedSnookPrice), 'Not enough balance');
    await MarketplaceGamer2.buySnook(1, {value: requestedSnookPrice});
    expect(await SnookTokenGamer1.ownerOf(1)).eq(gamer2);
    expect(await ethers.provider.getBalance(gamer1))
      .eq(maticBalanceGamer1.add(amountToSeller))
  });

});

