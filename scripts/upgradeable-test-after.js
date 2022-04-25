const { getNamedAccounts, ethers } = require("hardhat");

async function main() {
  const { deployer, gamer1: gamer } = await getNamedAccounts();
  const SkillTokenGamer = await ethers.getContract('SkillToken', gamer);
  const SnookTokenGamer = await ethers.getContract('SnookToken', gamer);
  const SnookGameDeployer = await ethers.getContract('SnookGame', deployer);
  const UniswapUSDCSkill = await ethers.getContract('UniswapUSDCSkill');

  const result = await SnookGameDeployer.hello();
  console.log('result:', result);

  console.log(`SnookGame: ${SnookGameDeployer.address}`);
  console.log(`SnookToken: ${SnookTokenGamer.address}`);
  console.log(`SkillToken: ${SkillTokenGamer.address}`);
  console.log(`UniswapUSDCSkill: ${UniswapUSDCSkill.address}`);
  
  const balance = await SnookTokenGamer.balanceOf(gamer);
  console.log(`balance: ${balance}`);  

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
