// Script goes over all living snook tokens and discovers the ones which should be placed into 
// SnookGame.fixPeriod2TokenStars()
const hre = require("hardhat");
const { ethers, getNamedAccounts } = hre;
const { utils: {formatEther: FE}} = ethers;

const vesting = require('../.vesting.json')
async function main() {
  const { deployer } = await getNamedAccounts();
  const Vesting = await ethers.getContract('Vesting', deployer);
  for (const plan in vesting) {
    console.log(`plan: ${plan} number of addresses: ${vesting[plan].length/2}`);
    for (let i=0; i<vesting[plan].length-1; i+=2) {
      const address = vesting[plan][i];
      const releasableAmount = await Vesting.getReleasableAmount(address);
      console.log(`${address} ${FE(releasableAmount)}`);
      if (releasableAmount.gt(0)) {
        try {
          const tx = await Vesting.release(address);
          console.log(`releasing for ${address}: hash: ${tx.hash}`);
          await tx.wait(1);
          console.log(`done: ${tx.hash}`);
        } catch(err) {
          console.log(err)
        }
      }
    }
  }
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
