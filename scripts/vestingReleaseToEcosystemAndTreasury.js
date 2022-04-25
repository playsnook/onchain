const assert = require('assert');
const hre = require("hardhat");
const { ethers, getNamedAccounts, network } = hre;
const { utils: {parseEther: PE}} = ethers;
const { getDeployGasPrice } = require('./lib');
const gasPrice = getDeployGasPrice(network.name);
const { Ecosystem } = require('../.vesting');

async function main() {
  const { deployer } = await getNamedAccounts();
  assert(deployer === Ecosystem[0], 'deployer is not Ecosystem');
  const Treasury = await ethers.getContract('Treasury', deployer);

  const Vesting = await ethers.getContract('Vesting');
  const tx1 = await Vesting.release(deployer, {gasPrice});
  console.log(`Releasing to Ecosystem, hash: ${tx1.hash}`);
  await tx1.wait(1);
  console.log('Released to Ecosystem');

  const tx2 = await Vesting.release(Treasury.address);
  console.log(`Releasing to Treasury, hash: ${tx2.hash}`);
  await tx2.wait(1);
  console.log('Released to Treasury');
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
