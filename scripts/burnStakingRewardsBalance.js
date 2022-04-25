
const { ethers } = require("hardhat");
const { utils: {formatEther: FE} } = ethers;
async function main() {
  const SkillToken = await ethers.getContract('SkillToken');
  const StakingRewards = await ethers.getContract('StakingRewards');
  const balance = await SkillToken.balanceOf(StakingRewards.address);
  console.log(`balance: ${FE(balance)}`);
  const tx = await StakingRewards.burnBalance();
  console.log(`burning hash: ${tx.hash}`);
  await tx.wait(1);
  console.log('done');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
