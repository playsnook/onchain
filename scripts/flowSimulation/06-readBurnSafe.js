const hre = require("hardhat");
const { ethers } = hre;
const { utils: {formatEther: FE} } = ethers;

async function main() {
  
  const BurnSafe = await ethers.getContract('BurnSafe');
  const burnSafeBalance = await BurnSafe.getBalance();
  const minBurnAmount = await BurnSafe.getMinimumSwapAmount();
  const maxBurnAmount = await BurnSafe.getMaximumSwapAmount();
  const minSwapFeeAmount = await BurnSafe.getMinimumSwapFeeAmount();
  const maxSwapFeeAmount = await BurnSafe.getMaximumSwapFeeAmount();
  const polygonStakingRewardsAddress = await BurnSafe.getPolygonStakingRewardsAddress();
  
  console.log(`BurnSafe address: ${BurnSafe.address}`);
  console.log(`Polygon StakingRewards Address:${polygonStakingRewardsAddress}`);
  console.log(`burnSafe balance: ${FE(burnSafeBalance)}`);
  console.log(`min burn amount: ${FE(minBurnAmount)}`);
  console.log(`max burn amount: ${FE(maxBurnAmount)}`);
  console.log(`max fee amount: ${FE(maxSwapFeeAmount)}`);
  console.log(`min fee amount: ${FE(minSwapFeeAmount)}`);
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
