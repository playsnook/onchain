const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const SnookGame = await ethers.getContract('SnookGame');
  const d1 = await SnookGame.describe(1);
  console.log(d1);
  const d2 = await SnookGame.describe(2);
  console.log(d2); 
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
