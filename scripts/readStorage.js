const hre = require("hardhat");
const { ethers } = hre;
async function main() {
  const SkinRewards = await ethers.getContract('SkinRewards');
  const Afterdeath = await ethers.getContract('Afterdeath');
  const BD1 = await Afterdeath.getBurialDelayInSeconds();
  const unused1 = await Afterdeath.getUNUSED();

  console.log(`BD1=${BD1}`);
  console.log(`UNUSED1:`, unused1, 'SkinRewards Address:', SkinRewards.address);

  const tx = await Afterdeath.setUNUSED(ethers.constants.MaxUint256);
  console.log(`setUNUSED hash:${tx.hash}`);
  await tx.wait(1);
  console.log(`done setting`);
  const unused2 = await Afterdeath.getUNUSED();
  console.log(`UNUSED2:`, unused2);
  const BD2 = await Afterdeath.getBurialDelayInSeconds();
  console.log(`BD2=${BD2}`);
  // BD2 === BD1
  // UNUSED1 = SkinRewards
  // UNUSED2 = 0xffff...
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
