const claimRewardsTxHashes = require('../claimRewardsTxHashes.json');

async function getTokenIdsForWhichRewardsWereClaimed() {
  const { deployer } = await ethers.getNamedSigners();
  const SkinRewards = await ethers.getContract('SkinRewards');

  const claimRewardsSelector = ethers.utils.id('claimRewards(uint256,uint256)').slice(0,10);
  console.log(`claimRewards selector:${claimRewardsSelector}`);

  const snookIdsClaimed = [];
  for (let txHash of claimRewardsTxHashes) {
    const tx = await deployer.provider.getTransaction(txHash);
    if (tx.to === SkinRewards.address) {
      if (tx.data.slice(0,10) === claimRewardsSelector) {
        const snookId = tx.data.slice(10, 10+32*2);
        snookIdsClaimed.push(snookId);
        console.log(`${txHash}: Claimed for snookId: ${parseInt(snookId, 16)} (${snookId})`);
      } 
    } 
  }

}

async function main() {
  await getTokenIdsForWhichRewardsWereClaimed();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.  
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
