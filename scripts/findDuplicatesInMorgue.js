const hre = require("hardhat");
const { ethers, getNamedAccounts } = hre;

async function main() {
  const { deployer } = await getNamedAccounts()
  const Afterdeath = await ethers.getContract('Afterdeath', deployer);
  const removedLength = await Afterdeath.getRemovedFromMorgueLength();
  const slice = await Afterdeath.getRemovedFromMorgue(0, removedLength);
  const snookIds = slice.map(id=>id.toNumber());
  const uniqSnookIds = new Set(snookIds);
  const duplicates = snookIds.length - uniqSnookIds.size;
  console.log(`duplicates: ${duplicates}`);
  
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
