// gravedigger.js: a script which runs bury function

require('dotenv').config();
const hre = require("hardhat");
const {ethers} = hre;
const NetworkName = hre.network.name;
const TransactionSpeed = 'fast';
const {getGasPrice} = require('../lib');
const AfterdeathDeployment = require(`../../deployments/${NetworkName}/Afterdeath.json`);

async function main() {
  const graver = await ethers.getNamedSigner('gravedigger');
  const Afterdeath = new ethers.Contract(AfterdeathDeployment.address, AfterdeathDeployment.abi, graver);
  setInterval(async () => {
    const gasPrice = await getGasPrice(NetworkName, TransactionSpeed);
    const tx = await Afterdeath.bury(ethers.BigNumber.from(process.env.GRAVEDIGGER_BURIAL_REQUESTS), {gasPrice});
    const receipt = await tx.wait(1);
    console.log(receipt);
  }, process.env.GRAVEDIGGER_INTERVAL * 1000 * 30);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main();