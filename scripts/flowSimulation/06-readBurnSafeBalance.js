const hre = require("hardhat");
const { ethers } = hre;
const { utils: {parseEther: PE, parseUnits: PU, formatEther: FE}, provider } = ethers;

async function main() {
  const SkillToken = await ethers.getContract('SkillToken');
  const BurnSafe = await ethers.getContract('BurnSafe');
  const burnSafeBalance = await SkillToken.balanceOf(BurnSafe.address);
  console.log(`burnSafe balance: ${FE(burnSafeBalance)}`);
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
