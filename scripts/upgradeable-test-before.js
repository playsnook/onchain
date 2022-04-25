const { getNamedAccounts, ethers } = require("hardhat");

async function main() {
  const { deployer, gamer1: gamer } = await getNamedAccounts();
  const SkillTokenGamer = await ethers.getContract('SkillToken', gamer);
  const SnookTokenGamer = await ethers.getContract('SnookToken', gamer);
  const SnookGameDeployer = await ethers.getContract('SnookGame', deployer);
  const SnookGameGamer = await ethers.getContract('SnookGame', gamer);
  const UniswapUSDCSkill = await ethers.getContract('UniswapUSDCSkill');
  const Treasury = await ethers.getContract('Treasury');

  await Treasury.transfer();

  console.log(`SnookGame: ${SnookGameDeployer.address}`);
  console.log(`SnookToken: ${SnookTokenGamer.address}`);
  console.log(`SkillToken: ${SkillTokenGamer.address}`);
  console.log(`UniswapUSDCSkill: ${UniswapUSDCSkill.address}`);
  
  const skillBalance = await SkillTokenGamer.balanceOf(gamer);
  console.log(`skill balancer of ${gamer}: ${ethers.utils.formatEther(skillBalance)}`);
  const snookPrice = await UniswapUSDCSkill.getSnookPriceInSkills();
  console.log(`snook price:: ${ethers.utils.formatEther(snookPrice)}`);
  await SkillTokenGamer.approve(SnookGameDeployer.address, snookPrice);
  await SnookGameDeployer.mint(gamer, 1,'uri');
  await SnookGameGamer.allowGame(1);
  await SnookGameDeployer.enterGame(1,0)
  await SnookGameDeployer.extractSnook(1, 10,10,10, 'better' )
  const balance = await SnookTokenGamer.balanceOf(gamer);
  console.log(`number of owned snooks: ${balance}`);  

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
