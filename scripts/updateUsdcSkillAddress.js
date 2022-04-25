const hre = require("hardhat");
const { ethers } = hre;
const { utils: {parseEther: PE, parseUnits: PU, formatEther: FE}, provider } = ethers;


async function main() {
  const { deployer } = await ethers.getNamedSigners();
  console.log(`deployer address: ${deployer.address}`);
  const SnookGame = await ethers.getContract('SnookGame', deployer);
  const UniswapUsdcSkill = await ethers.getContract('UniswapUSDCSkill');
  console.log(`UniswapUsdcSkill address: ${UniswapUsdcSkill.address}`);
  const tx = await SnookGame.updateUsdcSkillAddress(UniswapUsdcSkill.address);
  console.log(tx);
  await tx.wait(1);
  console.log('done');
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
