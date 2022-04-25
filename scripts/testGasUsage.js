// Script goes over all living snook tokens and discovers the ones which should be placed into 
// SnookGame.fixPeriod2TokenStars()
const assert  = require("assert");
const hre = require("hardhat");
const { Ecosystem } = require('../.vesting');

const { ethers, getNamedAccounts } = hre;
const { utils: {parseUnits: PU, formatUnits: FU}} = ethers;

async function main() {
  const { deployer } = await getNamedAccounts();
  //assert(deployer == Ecosystem, 'deployer is not ecosystem');

  const SkillToken = await ethers.getContract('SkillToken', deployer);
  const SnookGame = await ethers.getContract('SnookGame', deployer);
  const Vesting = await ethers.getContract('Vesting');

  const amount = await Vesting.getReleasableAmount(deployer);
  if (amount.gt(0)) {
    const tx1 = await Vesting.release(deployer);
    console.log(`Releasing to Ecosystem, hash: ${tx1.hash}`);
    await tx1.wait(1);
    console.log('Released to Ecosystem');
  }

  const allowed = await SkillToken.allowance(deployer, SnookGame.address);
  if (allowed.eq(0)) {
    const tx2 = await SkillToken.approve(SnookGame.address, ethers.constants.MaxUint256);
    console.log(`approving game: ${tx2.hash}`);
    await tx2.wait(1);
    console.log(`approved`);
  }

  const tx3 = await SnookGame.mint2(1, {gasLimit: 4000000});
  console.log(`minting: ${tx3.hash}`);
  const r = await tx3.wait(1);
  console.log(`minted`);
  console.log(`gas used: ${parseInt(r.gasUsed.toString(), 10)}`);

}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
