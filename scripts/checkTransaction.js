const hre = require("hardhat");
const{ ethers } = hre;
const { provider } = ethers; 
async function main() {

  const txHash = '0x4e80294f6d99e4c0fd3c85a650e27c42ed06cc213a7f8b9ed5ca4a5aab3ce279'; 
  const transaction = await provider.getTransaction(txHash);
  console.log(transaction);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
