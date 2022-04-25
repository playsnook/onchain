const hre = require("hardhat");
const { ethers } = hre;
const gasPrice = ethers.utils.parseUnits('40', 'gwei');
async function main() {
  const  deployer = await ethers.getNamedSigner('deployer');
  const Treasury = await ethers.getContract('Treasury', deployer);
  const tx = await Treasury.transfer({gasPrice});
  console.log(`Treasury transfer, hash: ${tx.hash}`);
  await tx.wait(1);
  console.log('Transfer is done');
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
