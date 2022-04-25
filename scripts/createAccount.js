const hre = require("hardhat");
const { ethers } = hre;
async function main() {
  const wallet = new ethers.Wallet.createRandom();
  console.log(`Address: ${wallet.address}\nPrivate Key: ${wallet.privateKey}`);  
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
