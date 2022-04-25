// Script for simulation 
const delay = require("delay");
const hre = require("hardhat");
const { ethers } = hre;
const pks = require('../gamer_pks.json');

const gasPrice = ethers.utils.parseUnits('30', 'gwei');


function getRandomInt(min, max) {
  return Math.round(Math.random()*(max-min)+min);
}

async function createStarHolders() {
  const deployer  = await ethers.getNamedSigner('deployer');
  const SnookGameDeployer = await ethers.getContract('SnookGame', deployer);
  const UniswapUSDCSkillDeployer = await ethers.getContract('UniswapUSDCSkill', deployer);
  
  const snookPrice = await UniswapUSDCSkillDeployer.getSnookPriceInSkills();
  console.log('price: ', ethers.utils.formatEther(snookPrice));
  

  const starValues = [0,1,11,21,31];
  for (let pk of pks) {
    const gamer = new ethers.Wallet(pk, deployer.provider);
    console.log(`gamer address: ${gamer.address}, pk: ${pk}`);
    const SnookGameGamer = await ethers.getContract('SnookGame', gamer);
    const SnookTokenGamer = await ethers.getContract('SnookToken', gamer);
    const SkillTokenGamer = await ethers.getContract('SkillToken', gamer);

    const gamerMaticBalance = await deployer.provider.getBalance(gamer.address);
    console.log(`gamer Matic balance: ${ethers.utils.formatEther(gamerMaticBalance)}`);
    if (gamerMaticBalance.lt(ethers.utils.parseUnits('0.005', 'ether'))) {
      console.log(`too low Matic balance, go next`);
      continue;
    }

    const gamerSkillBalance = await SkillTokenGamer.balanceOf(gamer.address);
    console.log(`gamer Skill balance: ${ethers.utils.formatEther(gamerSkillBalance)}`);
    
    const tx5 = await SkillTokenGamer.approve(SnookGameDeployer.address, snookPrice, {gasPrice});
    console.log(`approve tx: ${tx5.hash}`);
    await tx5.wait(1);
    console.log(`approved`);
    const tx4 = await SnookGameDeployer.mint(gamer.address, 1, "https://zain.com", {gasPrice});
    console.log(`mint tx: ${tx4.hash}`)
    await tx4.wait(1);
    const tokenCount = await SnookTokenGamer.balanceOf(gamer.address);
    const tokenId = await SnookTokenGamer.tokenOfOwnerByIndex(gamer.address, tokenCount-1); 
    console.log(`minted snook id:${tokenId}`);
    const tx1 = await SnookGameGamer.allowGame(tokenId, {gasPrice});
    console.log(`allowGame hash: ${tx1.hash}`);
    await tx1.wait(1);
    const tx2 = await SnookGameDeployer.enterGame(tokenId, 0, {gasPrice});
    console.log(`enterGame hash: ${tx2.hash}`)
    await tx2.wait(1);
    const stars = starValues[getRandomInt(0,starValues.length-1)];
    console.log(`extracting with stars:${stars}`);
    const tx3 = await SnookGameDeployer.extractSnook(tokenId, 10, stars, 10, 'https://extract.com', {gasPrice});
    console.log(`extarct hash: ${tx3.hash}`);
    await tx3.wait(1);
    console.log('extracted');

  }
  
}

async function returnMaticFromStarHoldersToDeployer() {
  const deployer  = await ethers.getNamedSigner('deployer');
  for (const pk of pks) {
    const gamer = new ethers.Wallet(pk, deployer.provider);
    const gamerMaticBalance = await deployer.provider.getBalance(gamer.address);

    console.log(`gamer address: ${gamer.address}, balance: ${ethers.utils.formatEther(gamerMaticBalance)}`);
    const  gasPrice = ethers.utils.parseUnits('30', 'gwei');
    const  transaction = {
      to: deployer.address,
      value: gamerMaticBalance,
      gasPrice,
    };
    const gasCost = await deployer.provider.estimateGas(transaction);
    transaction.value = gamerMaticBalance.sub(gasCost.mul(gasPrice));
    const tx = await gamer.sendTransaction(transaction);
    console.log(`sent tx, hash: ${tx.hash}`);
    const r = await tx.wait(1);
    console.log(`receipt: ${r}`);
    await delay(20000);
  }
}

async function discoverTokens() {
  const deployer  = await ethers.getNamedSigner('deployer');
  const SnookGameDeployer = await ethers.getContract('SnookGame', deployer);
  const SnookTokenDeployer = await ethers.getContract('SnookToken', deployer);

  for (let pk of pks) {
    const gamer = new ethers.Wallet(pk, deployer.provider);
    const gamerSnookBalance = await SnookTokenDeployer.balanceOf(gamer.address);
    for (let i=0; i<gamerSnookBalance; i++) {
      const tokenId = await SnookTokenDeployer.tokenOfOwnerByIndex(gamer.address, i);
      const { stars } = await SnookGameDeployer.describe(tokenId);
      console.log(`${gamer.address}|${tokenId}|${stars}`);
    }
  }
}

async function main() {
  // await createStarHolders();
  // await discoverTokens();
  await returnMaticFromStarHoldersToDeployer();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
