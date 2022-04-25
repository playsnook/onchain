// Script for simulation 
const hre = require("hardhat");
const _ = require('lodash');
const { getSkillToken, getDeployGasPrice } = require("../lib");

const { ethers, network } = hre;
const pks = require('../../pks.json');
const { utils: {parseEther: PE, parseUnits: PU, formatEther: FE}, provider } = ethers;
const gasPrice = getDeployGasPrice(network.name);

async function main() {
  const deployer  = await ethers.getNamedSigner('deployer');
  const SnookGameDeployer = await ethers.getContract('SnookGame', deployer);

  for (let i=0; i<pks.length; i++) {
    const pk = pks[i];
    const gamer = new ethers.Wallet(pk, deployer.provider);
    console.log(`gamer address: ${gamer.address}, pk: ${pk}`);
    const SnookGameGamer = await ethers.getContract('SnookGame', gamer);
    const SnookTokenGamer = await ethers.getContract('SnookToken', gamer);
    const SkillTokenGamer = await getSkillToken(gamer);

    const gamerMaticBalance = await provider.getBalance(gamer.address);
    console.log(`gamer Matic balance: ${FE(gamerMaticBalance)}`);
    if (gamerMaticBalance.lt(PU('0.005', 'ether'))) {
      console.log(`too low Matic balance, go next`);
      continue;
    }

    const gamerSkillBalance = await SkillTokenGamer.balanceOf(gamer.address);
    console.log(`gamer Skill balance: ${FE(gamerSkillBalance)}`);

    const gamerSnookBalance = await SnookTokenGamer.balanceOf(gamer.address);
    console.log(`gamer Snook balance: ${gamerSnookBalance}`);
    for (let k=0; k<gamerSnookBalance; k++) {
      console.log(`snook index: ${k}`);
      const tokenId = await SnookTokenGamer.tokenOfOwnerByIndex(gamer.address, k);
      console.log(`tokenId: ${tokenId}`);
      const tx2 = await SnookGameGamer.enterGame2(tokenId, {gasPrice});
      console.log(`enterGame2 hash: ${tx2.hash}`)
      await tx2.wait(1);
      
      const stars = _.random(1,4);
      const traits = _.random(11,25);
      if (gamerSnookBalance > 1 && k==0) {
        const killerTokenId = await SnookTokenGamer.tokenOfOwnerByIndex(gamer.address, k+1);
        console.log(`killing ${tokenId} with ${killerTokenId}, traits: ${traits}, stars: ${stars}`);
        const tx1 = await SnookGameDeployer.reportKill(tokenId, traits, stars, 'extracted', killerTokenId, {gasPrice});
        console.log('kill hash', tx1.hash);
        await tx1.wait(1);
        console.log('killed');
      } else { // extract
        
        console.log(`extracting with stars:${stars}, traits: ${traits}`);
        const tx3 = await SnookGameDeployer.extractSnook(tokenId, traits, stars, 10, 'https://extract.com', {gasPrice});
        console.log(`extract hash: ${tx3.hash}`);
        await tx3.wait(1);
        console.log('extracted');
      }
    }
  }
  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
