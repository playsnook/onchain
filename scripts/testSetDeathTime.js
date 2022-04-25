const hre = require("hardhat");
const { ethers, network } = hre;
console.log(`network: ${network.name}`)
async function main() {
  const { deployer, gamer1 } = await ethers.getNamedSigners();
  const SnookGameDeployer = await ethers.getContract('SnookGame', deployer);
  const SnookGameGamer1 = await ethers.getContract('SnookGame', gamer1);
  // const tx1 = await SnookGameGamer1.enterGame2(295);
  // console.log('entry hash:', tx1.hash);
  // await tx1.wait(1);
  // console.log('entered');
  const tx2 = await SnookGameDeployer.setDeathTime(295,1,1,1,'test',295 );
  console.log(`tx2 hash: ${tx2.hash}`)
  await tx2.wait(2)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
