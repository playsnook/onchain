const hre = require("hardhat");
const fs = require('fs/promises');
const getRevertReason = require('eth-revert-reason')
const {ethers} = hre;
const gasPrice = ethers.utils.parseUnits('50', 'gwei');
const gasLimit = 1_000_000;
const _ = require('lodash');


async function getStorageValue(contractName, slot) {
  const {sgeSender} = await ethers.getNamedSigners();
  const contract = await ethers.getContract(contractName, sgeSender);
  const data = await ethers.provider.getStorageAt(contract.address, slot);
  return data;
}

async function getTransactionCode(txHash) {
  const tx = await ethers.provider.getTransaction(txHash);
  const code = await ethers.provider.call(tx);
  return code;
}

async function traceTransaction(txHash) {
  const params = {disableStack: false, disableMemory: false, disableStorage: false}; 
  const result = await ethers.provider.send('debug_traceTransaction', [ txHash, params])
  return result;
}

async function main() {
  // const txHash = '0x39f2ce78fc9efdcacd96c64b534bb445f736aa126b7e8ab39be9460591f744d9';
  const txHash = '0x0995fa60566a6d9bd04fbe3b44c9ac9c08d32e349f22aea319341138d61e92d3';
  // const data = await getStorageValue('SkinRewards', 256);
  // console.log(data);
  const code = await getTransactionCode(txHash);
  console.log(code);
  //const trace = await traceTransaction(txHash);
  console.log(trace);
  // await fs.writeFile('txtrace2.log', JSON.stringify(trace, null, 2));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
