// SnookGame2 tests SnookGame with enterGame2() function
require('dotenv').config();
const { expect } = require("chai");
const {deployments, ethers, getNamedAccounts } = require('hardhat');
const { nextMonth } = require('../scripts/lib');
const { utils: {formatEther: FE}, constants: {MaxUint256}} = ethers;


describe('SnookGame', () => { 
  describe('Getters', function() {
    let UniswapUSDCSkill;
    let SkillToken;
    let SnookGame;
    let Afterdeath;
    let Treasury;
    let SnookState;
    let SnookToken;
    beforeEach(async () => {
      await deployments.fixture(['L2']);
      UniswapUSDCSkill = await ethers.getContract('UniswapUSDCSkill');
      SkillToken = await ethers.getContract('SkillToken');
      SnookToken = await ethers.getContract('SnookToken');
      SnookGame = await ethers.getContract('SnookGame');
      SnookState = await ethers.getContract('SnookState');
      Afterdeath = await ethers.getContract('Afterdeath');
      Treasury = await ethers.getContract('Treasury');
    });
    
    it('test getUniswapUSDCSkillAddress()', async () => {
      expect(await SnookGame.getUniswapUSDCSkillAddress()).eq(UniswapUSDCSkill.address);
    });

    it('test getSnookStateAddress()', async () => {
      expect(await SnookGame.getSnookStateAddress()).eq(SnookState.address);
    });

    it('test getSNKAddress()', async ()=>{
      expect(await SnookGame.getSNKAddress()).eq(SkillToken.address);
    });

    it('test getSnookAddress()', async ()=>{
      expect(await SnookGame.getSNOOKAddress()).eq(SnookToken.address);
    });

    it('test getAfterdeathAddress()', async ()=>{
      expect(await SnookGame.getAfterdeathAddress()).eq(Afterdeath.address);
    });

  });
  describe('Pausability', function() {
    let UniswapUSDCSkill;
    let SkillTokenGamer;
    let SnookGameDeployer;
    let SnookGameGamer;
    let TreasuryGamer;
    let deployer;
    let gamer;
    let snookPrice;
    beforeEach(async ()=>{
      await deployments.fixture(['L2']);
      const accounts = await getNamedAccounts();
      deployer = accounts.deployer;
      gamer = accounts.gamer1;
      UniswapUSDCSkill = await ethers.getContract('UniswapUSDCSkill');
      SkillTokenGamer = await ethers.getContract('SkillToken', gamer);
      SnookGameDeployer = await ethers.getContract('SnookGame', deployer);
      SnookGameGamer = await ethers.getContract('SnookGame', gamer);
      SnookTokenGamer = await ethers.getContract('SnookToken', gamer);
      SnookTokenDeployer = await ethers.getContract('SnookToken', deployer);
      TreasuryGamer = await ethers.getContract('Treasury', gamer);
      snookPrice = await UniswapUSDCSkill.getSnookPriceInSkills();
      const livesPerSnook = await SnookGameDeployer.getLivesPerSnook();
      await SkillTokenGamer.approve(SnookGameDeployer.address, snookPrice.mul(livesPerSnook));
      await TreasuryGamer.transfer();
    });

    it('tests mint reverts when contract is paused', async ()=>{
      await SnookGameDeployer.pause();
      await expect(
        SnookGameGamer.mint2(1)
      ).to.be.revertedWith('Pausable: paused');
    });

    it('tests mint does not revert when contract is paused and then unpaused', async ()=>{
      await SnookGameDeployer.pause();
      await SnookGameDeployer.unpause();
      await expect(
        SnookGameGamer.mint2(1)
      ).to.be.not.reverted;
    });
  });

  describe('L2bidged', function() {
    let livesPerSnook;
    let SnookGameDeployer;
    let SnookGameGamer1;
    let SnookGameGamer2;
    let SkillTokenGamer1;
    let SkillTokenGamer2;
    let BurnSafeDeployer;
    let snookPrice;
    let deployer;
    let gamer1;
    let gamer2;
    
    beforeEach(async () => {
      await deployments.fixture(['L2bridged']);
      ({ deployer, gamer1, gamer2 } = await getNamedAccounts());
      const UniswapUSDCSkill = await ethers.getContract('UniswapUSDCSkill');
      snookPrice = await UniswapUSDCSkill.getSnookPriceInSkills();
      SnookGameDeployer = await ethers.getContract('SnookGame', deployer);
      SkillTokenGamer1 = await ethers.getContract('SkillToken', gamer1);
      SkillTokenGamer2 = await ethers.getContract('SkillToken', gamer2);
      SnookTokenGamer1 = await ethers.getContract('SnookToken', gamer1);
      SnookTokenGamer2 = await ethers.getContract('SnookToken', gamer2);
      SnookGameGamer1 = await ethers.getContract('SnookGame', gamer1);
      SnookGameGamer2 = await ethers.getContract('SnookGame', gamer2);
      BurnSafeDeployer = await ethers.getContract('BurnSafe', deployer);
      livesPerSnook = await SnookGameDeployer.getLivesPerSnook();
    });

    it('tests minting DOES NOT decrease total supply of skill token by MintBurnPercentage of snook price', async ()=>{
      const totalSupply1 = await SkillTokenGamer1.totalSupply();
      await SkillTokenGamer1.approve(SnookGameGamer1.address, MaxUint256);
      const nSnooks = 10; 
      await SnookGameGamer1.mint2(nSnooks);
      const totalSupply2 = await SkillTokenGamer1.totalSupply();
      expect(totalSupply1).eq(totalSupply2);
    });
    it('tests minting sents MintBurnPercentage amount of snook price to external burner address', async ()=>{
      const externalBurnerBalance1 = await SkillTokenGamer1.balanceOf(BurnSafeDeployer.address);
      await SkillTokenGamer1.approve(SnookGameGamer1.address, MaxUint256);
      const nSnooks = 10; 
      await SnookGameGamer1.mint2(nSnooks);
      const MintBurnPercentage = await SnookGameGamer1.MINT_BURN_PERCENTAGE();
      const burntSupply = snookPrice
        .mul(10).mul(livesPerSnook)
        .mul(MintBurnPercentage).div(100);
      const externalBurnerBalance2 = await SkillTokenGamer1.balanceOf(BurnSafeDeployer.address);
      expect(externalBurnerBalance2).eq(externalBurnerBalance1.add(burntSupply));
    });
  })

  describe('General behavior', function() {
    let livesPerSnook;
    let SnookGameDeployer;
    let SnookGameGamer1;
    let SnookGameGamer2;
    let SkillTokenGamer1;
    let SkillTokenGamer2;
    let snookPrice;
    let deployer;
    let gamer1;
    let gamer2;
    beforeEach(async () => {
      await deployments.fixture(['L2']);
      ({ deployer, gamer1, gamer2 } = await getNamedAccounts());
      const UniswapUSDCSkill = await ethers.getContract('UniswapUSDCSkill');
      snookPrice = await UniswapUSDCSkill.getSnookPriceInSkills();
      SnookGameDeployer = await ethers.getContract('SnookGame', deployer);
      SkillTokenGamer1 = await ethers.getContract('SkillToken', gamer1);
      SkillTokenGamer2 = await ethers.getContract('SkillToken', gamer2);
      SnookTokenGamer1 = await ethers.getContract('SnookToken', gamer1);
      SnookTokenGamer2 = await ethers.getContract('SnookToken', gamer2);
      SnookGameGamer1 = await ethers.getContract('SnookGame', gamer1);
      SnookGameGamer2 = await ethers.getContract('SnookGame', gamer2);
      livesPerSnook = await SnookGameDeployer.getLivesPerSnook();
    });
    
    
    it('tests snook token emits Locked event', async ()=>{
      await SkillTokenGamer1.approve(SnookGameDeployer.address, snookPrice.mul(livesPerSnook));
      await SnookGameGamer1.mint2(1);
      await expect(
        SnookGameGamer1.enterGame2(1)
      ).to.emit(SnookTokenGamer1, 'Locked')
      .withArgs(gamer1, 1, true, 'enterGame2');
      await expect(
        SnookGameDeployer.extractSnook(1, 7,4,10, 'better' )
      ).to.emit(SnookTokenGamer1, 'Locked')
      .withArgs(gamer1, 1, false, 'extract');
    });

    it('enumerates 3 minted snooks of gamer', async ()=>{
      await SkillTokenGamer1.approve(SnookGameGamer1.address, MaxUint256);
      await SnookGameGamer1.mint2(3);
      const balance = await SnookTokenGamer1.balanceOf(gamer1);
      const snookIds = [];
      for (let i=0; i<balance; i++) {
        const tokenId = await SnookTokenGamer1.tokenOfOwnerByIndex(gamer1, i);
        snookIds.push(tokenId.toNumber());
      }
      expect(snookIds).to.include.ordered.members([1,2,3]);
    });

    it('tests minting decreases total supply of skill token by MintBurnPercentage of snook price', async ()=>{
      const totalSupply1 = await SkillTokenGamer1.totalSupply();
      await SkillTokenGamer1.approve(SnookGameGamer1.address, MaxUint256);
      const nSnooks = 10; 
      await SnookGameGamer1.mint2(nSnooks);
      const MintBurnPercentage = await SnookGameGamer1.MINT_BURN_PERCENTAGE();
      const burntSupply = snookPrice
        .mul(10).mul(livesPerSnook)
        .mul(MintBurnPercentage).div(100);
      const totalSupply2 = await SkillTokenGamer1.totalSupply();
      expect(totalSupply1).eq(totalSupply2.add(burntSupply));
    });

    it('tests minting decreases balance of buyer by snook price', async ()=>{
      const balance1 = await SkillTokenGamer1.balanceOf(gamer1);
      const spentAmount = snookPrice.mul(livesPerSnook);
      await SkillTokenGamer1.approve(SnookGameGamer1.address, spentAmount);
      await SnookGameGamer1.mint2(1);
      const balance2 = await SkillTokenGamer1.balanceOf(gamer1);
      expect(balance1).eq(balance2.add(spentAmount));
    });

    it('tests not owner of a token cannot enter the game with the token', async ()=>{
      const nSnook = 1;
      await SkillTokenGamer1.approve(SnookGameDeployer.address, snookPrice.mul(livesPerSnook).mul(nSnook));
      await SnookGameGamer1.mint2(nSnook);
      await expect(
        SnookGameGamer2.enterGame2(1)
      ).to.be.revertedWith('Not snook owner');
    });

    it('tests a snook is locked on game entry and cannot be transferred to another user', async ()=>{
      await SkillTokenGamer1.approve(SnookGameDeployer.address, MaxUint256);
      await SnookGameGamer1.mint2(1);
      
      await expect(
        SnookGameGamer1.enterGame2(1)
      ).to.emit(SnookGameGamer1, 'Entry').withArgs(gamer1, 1);

      await expect(
        SnookTokenGamer1.transferFrom(gamer1, gamer2, 1)
      ).to.be.revertedWith('Token is locked');

    });

    it('tests a snook cannot be extracted by its owner while snook is in game', async ()=>{
      await SkillTokenGamer1.approve(SnookGameDeployer.address, MaxUint256);
      await SnookGameGamer1.mint2(1);
      
      await expect(
        SnookGameGamer1.enterGame2(1)
      ).to.emit(SnookGameGamer1, 'Entry').withArgs(gamer1, 1);

      await expect(
        SnookGameGamer1.extractSnook(1, 10,10,10, 'better')
      ).to.be.reverted;
    });

    it('tests a snook cannot be stolen by SnookGame contract owner while snook in game', async ()=>{
      await SkillTokenGamer1.approve(SnookGameDeployer.address, MaxUint256);
      await SnookGameGamer1.mint2(1);
      
      await expect(
        SnookGameGamer1.enterGame2(1)
      ).to.emit(SnookGameGamer1, 'Entry').withArgs(gamer1, 1);

      await expect(
        SnookTokenDeployer.transferFrom(gamer1, deployer, 1)
      ).to.be.revertedWith('ERC721: transfer caller is not owner nor approved');
    });

    it('tests a snook in game approved for transfer by owner to another user cannot be transferred by another user', async ()=>{
      
      await SkillTokenGamer1.approve(SnookGameDeployer.address, MaxUint256);
      await SnookGameGamer1.mint2(1);
      
      await expect(
        SnookGameGamer1.enterGame2(1)
      ).to.emit(SnookGameGamer1, 'Entry').withArgs(gamer1, 1);

      await expect(
        SnookTokenGamer1.approve(gamer2, 1)
      ).to.be.emit(SnookTokenGamer1, 'Approval').withArgs(gamer1, gamer2, 1);

      await expect(
        SnookTokenGamer2.transferFrom(gamer1, gamer2, 1)
      ).to.be.revertedWith('Token is locked')

    });

    
    it('tests after extraction a snook can be transferred to another user by snook owner', async ()=>{
      await SkillTokenGamer1.approve(SnookGameDeployer.address, MaxUint256);
      await SnookGameGamer1.mint2(1);
      
      await expect(
        SnookGameGamer1.enterGame2(1)
      ).to.emit(SnookGameGamer1, 'Entry').withArgs(gamer1, 1);

      await expect(
        SnookGameDeployer.extractSnook(1, 1, 1, 1, 'extracted')
      ).to.emit(SnookGameDeployer, 'Extraction').withArgs(gamer1, 1);

      await expect(
        SnookTokenGamer1.transferFrom(gamer1, gamer2, 1)
      ).to.emit(SnookTokenGamer1, 'Transfer').withArgs(gamer1, gamer2, 1);
      
    });

    it('tests a gamer cannot ressurect died snook without paying', async ()=>{
      const AfterdeathGamer1 = await ethers.getContract('Afterdeath', gamer1);
      await SkillTokenGamer1.approve(SnookGameDeployer.address, MaxUint256);
      await SnookGameGamer1.mint2(1);
      await SnookGameGamer1.enterGame2(1);
      for (let i=0; i<livesPerSnook; i++) {
        await SnookGameDeployer.reportKill(1, 0, 0, 'uri', 1, false);
      }
      await expect(
        AfterdeathGamer1.resurrect(1)
      ).to.be.revertedWith('ERC20: transfer amount exceeds allowance');
    });

    it('tests a gamer cannot ressurect died snook after burial period', async ()=>{
      const AfterdeathGamer1 = await ethers.getContract('Afterdeath', gamer1);
      await SkillTokenGamer1.approve(SnookGameDeployer.address, MaxUint256);
      await SnookGameGamer1.mint2(1);
      await SnookGameGamer1.enterGame2(1);
      for (let i=0; i<livesPerSnook; i++) {
        await SnookGameDeployer.reportKill(1, 0, 0, 'uri', 1, false);
      }
      // expire burial period
      await nextMonth();

      await expect(
        AfterdeathGamer1.resurrect(1)
      ).to.be.revertedWith('Too late');
    });

    it('tests a gamer cannot ressurect died snook after burial period and burial', async ()=>{
      const AfterdeathGamer1 = await ethers.getContract('Afterdeath', gamer1);
      await SkillTokenGamer1.approve(SnookGameDeployer.address, MaxUint256);
      await SnookGameGamer1.mint2(1);
      await SnookGameGamer1.enterGame2(1);
      for (let i=0; i<livesPerSnook; i++) {
        await SnookGameDeployer.reportKill(1, 0, 0, 'uri', 1, false);
      }
      // expire burial period
      await nextMonth();
      // bury
      await AfterdeathGamer1.bury(1);
      await expect(
        AfterdeathGamer1.resurrect(1)
      ).to.be.revertedWith('ERC721: isLocked query for nonexistent token');
    });

    it('tests a dead snook cannot be transferred from owner to another user', async ()=>{
    
      await SkillTokenGamer1.approve(SnookGameDeployer.address, MaxUint256);
      await SnookGameGamer1.mint2(1);
      await SnookGameGamer1.enterGame2(1);
      for (let i=0; i<livesPerSnook; i++) {
        await SnookGameDeployer.reportKill(1, 0, 0, 'uri', 1, false);
      }
      
      await expect(
        SnookTokenGamer1.transferFrom(gamer1, gamer2, 1)
      ).to.be.revertedWith('Token is locked');
    });

    it('tests emergency extraction of all snooks in game without update', async ()=>{
      await SkillTokenGamer1.approve(SnookGameDeployer.address, MaxUint256);
      await SnookGameGamer1.mint2(1);
      await SnookGameGamer1.enterGame2(1);

      await SkillTokenGamer2.approve(SnookGameDeployer.address, MaxUint256);
      await SnookGameGamer2.mint2(1);
      await SnookGameGamer2.enterGame2(2);

      await SnookGameDeployer.extractSnooksWithoutUpdate([1,2]);
      expect(
        await SnookTokenGamer1.isLocked(1)
      ).to.be.false;

      expect(
        await SnookTokenGamer2.isLocked(2)
      ).to.be.false;

    });
  })
});