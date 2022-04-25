
const hre = require('hardhat');
const assert = require('assert');
const { ethers, network } = hre;
const { address: SGEaddress, abi: SGEabi } = require(`../../deployments/${network.name}/SGE.json`);
const data = require('./data.json');
const gasPrice = ethers.BigNumber.from(100e9);
const gasLimit = ethers.BigNumber.from(19_000_000);

async function sendBulk(accounts, arrTokenURIs, SGE) {
  const tx = await SGE.bulkMint(accounts, arrTokenURIs, {gasPrice, gasLimit});
  console.log(`waiting for ${tx.hash}`);
  await tx.wait(1);
  console.log(`confirmed: ${tx.hash}`);
}

async function main() {
  console.log(`uris: ${data.arrTokenURIs.length} accs: ${data.accounts.length}`)
  assert(data.arrTokenURIs.length == data.accounts.length, `arrToken=${data.arrTokenURIs.length}, accs=${data.accounts.length}`);
  
  const bulkSize = 12;
  const totalBulks = Math.floor((data.accounts.length + bulkSize) / bulkSize);
  
  console.log(`Start: bulkSize=${bulkSize}, totalBulks: ${totalBulks}`);
  const sgeSender = await ethers.getNamedSigner('sgeSender');
  console.log(`SGE Sender address: ${sgeSender.address}`);
  const sgeSenderBalance = await sgeSender.getBalance();
  console.log(`SGESender balance: ${ethers.utils.formatEther(sgeSenderBalance)}`);
  const SGE = new ethers.Contract(SGEaddress, SGEabi, sgeSender);

  for (let bulkNum = 1198; bulkNum<totalBulks; bulkNum++) {
    const startIndex = bulkNum * bulkSize;
    let endIndex = bulkSize + startIndex;
    if (endIndex > data.accounts.length) {
      endIndex = data.accounts.length;
    }
    console.log(`bulkNum=${bulkNum}, startIndex=${startIndex}, endIndex=${endIndex} totalBulks=${totalBulks} ${Date()}`);
    const accounts = data.accounts.slice(startIndex, endIndex);
    const arrTokenURIs = data.arrTokenURIs.slice(startIndex,endIndex);
    console.log(accounts);
    //console.log(arrTokenURIs);
    await sendBulk(accounts, arrTokenURIs, SGE);
    console.log(`Done: bulkNum=${bulkNum} ${Date()}`);
  }

  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
