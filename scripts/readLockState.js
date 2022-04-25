
const hre = require("hardhat");
const { ethers } = hre;
async function main() {
  const SnookToken = await ethers.getContract('SnookToken');
  const result = await SnookToken.isLocked(3455);
  console.log(result);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
