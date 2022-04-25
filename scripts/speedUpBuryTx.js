
const hre = require("hardhat");
const { ethers } = hre;
const gasPrice = ethers.utils.parseUnits('100', 'gwei');
const gasLimit = 10_000_000;
const nonce = ethers.BigNumber.from(6600);
async function main() {
  const { gravedigger } = await ethers.getNamedSigners('gravedigger');
  console.log(`gravedigger address: ${gravedigger.address}`);
  
  const Afterdeath = await ethers.getContract('Afterdeath', gravedigger.address);
  const tx = await Afterdeath.bury(50, {
    nonce,
    gasPrice,
    gasLimit
  });
  console.log(`tx hash: ${tx.hash}`);
  const r = await tx.wait(1);
  console.log(r);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
