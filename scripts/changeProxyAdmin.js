const hre = require("hardhat");
const pks = require('../pks.json');
const { ethers } = hre;
const { utils: {parseUnits: PU, formatUnits: FU}, Wallet, provider} = ethers;
async function main() {
  const { deployer, gamer1 } = await ethers.getNamedSigners();

  const signer = new Wallet(pks[0], provider);
  console.log(`signer: ${signer.address}`);

  const DefaultProxyAdmin = await ethers.getContract("DefaultProxyAdmin", gamer1);
  const SnookGame = await ethers.getContract('SnookGame');
  const Afterdeath = await ethers.getContract('Afterdeath');
  
  const defaultProxyAdminOwner = await DefaultProxyAdmin.owner();
  console.log(`DefaultProxyAdmin address: ${DefaultProxyAdmin.address}`);
  console.log(`defaultProxyAdminOwner: ${defaultProxyAdminOwner}`);
  
  const proxyAdminOfAfterdeath = await DefaultProxyAdmin.getProxyAdmin(Afterdeath.address);
  console.log(`proxyAdminOfAfterdeath: ${proxyAdminOfAfterdeath}`);
  const proxyAdminOfSnookGame = await DefaultProxyAdmin.getProxyAdmin(SnookGame.address);
  console.log(`proxyAdminOfSnookGame: ${proxyAdminOfSnookGame}`);


  const tx = await DefaultProxyAdmin.transferOwnership(signer.address, {gasPrice: PU('34', 'gwei')});  
  console.log(`transfer ownership tx hash: ${tx.hash}`);
  await tx.wait(1);
  console.log(`done`);
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
