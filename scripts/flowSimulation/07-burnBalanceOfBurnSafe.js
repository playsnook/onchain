const hre = require("hardhat");
const { ethers } = hre;
const { utils: {formatEther: FE} } = ethers;

async function main() {
  const BurnSafe = await ethers.getContract('BurnSafe');
  const tx = await BurnSafe.swapoutBalance();
  console.log(`burn hash: ${tx.hash}`);
  await tx.wait(1);
  console.log(`done`);
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
