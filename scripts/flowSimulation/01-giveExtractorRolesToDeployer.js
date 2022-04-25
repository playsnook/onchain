const hre = require("hardhat");
const { ethers, getNamedAccounts } = hre;
const { utils: {parseEther: PE, parseUnits: PU, formatEther: FE}, provider } = ethers;


async function main() {
  const  { deployer } = await getNamedAccounts();
  const SnookGame = await ethers.getContract('SnookGame');
 
  const EXTRACTOR_ROLE = await SnookGame.EXTRACTOR_ROLE();
  const KILLER_ROLE = await SnookGame.KILLER_ROLE();
  const EMERGENCY_EXTRACTOR_ROLE = await SnookGame.EMERGENCY_EXTRACTOR_ROLE();
  console.log(
    'extractor', EXTRACTOR_ROLE, 
    'killer', KILLER_ROLE, 
    'em_extractor', EMERGENCY_EXTRACTOR_ROLE
  );  

  const tx1 = await SnookGame.grantRole(EXTRACTOR_ROLE, deployer);
  console.log(`Granting EXTRACTOR, hash: ${tx1.hash}`);
  await tx1.wait(1);
  console.log('Granted EXTRACTOR');

  const tx2 = await SnookGame.grantRole(KILLER_ROLE, deployer);
  console.log(`Granting KILLER: ${tx2.hash}`);
  await tx2.wait(1);
  console.log('Granted KILLER');

  const tx3 = await SnookGame.grantRole(EMERGENCY_EXTRACTOR_ROLE, deployer);
  console.log(`Granting EMERGENCY_EXTRACTOR_ROLE: ${tx3.hash}`);
  await tx3.wait(1);
  console.log('Granted EMERGENCY_EXTRACTOR_ROLE');

}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
