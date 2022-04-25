
const hre = require("hardhat");
const { ethers } = hre;
const gasPrice = ethers.utils.parseUnits('100', 'gwei');

async function callInitSGE(contractName) {
  const { deployer } = await ethers.getNamedSigners();
  const SGE = await ethers.getContract('SGE');

  const contract = await ethers.getContract(contractName, deployer);
  console.log(`deployer address: ${deployer.address} contract: ${contractName} contract address: ${contract.address}`);
  const tx = await contract.initSGE(SGE.address, {gasPrice});
  console.log(`hash: ${tx.hash}`);
  await tx.wait(1);
  console.log(`done`);
}

async function main() {
  await callInitSGE('SnookToken');
  await callInitSGE('SnookState');
  await callInitSGE('Afterdeath');
  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
