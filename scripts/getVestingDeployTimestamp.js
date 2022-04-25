const hre = require("hardhat");
const { ethers } = hre;
const VestingDeployment = require(`../deployments/polygon/Vesting.json`);
async function main() {
  const { deployer } = await ethers.getNamedSigners();
  const { blockNumber, transactionHash } = VestingDeployment.receipt; 
  const { timestamp } = await deployer.provider.getBlock(blockNumber);
  console.log(`blockNum: ${blockNumber} timestamp: ${timestamp} txHash: ${transactionHash}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
