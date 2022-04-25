const hre = require("hardhat");
const { ethers, network } = hre;
const { utils: {parseEther: PE, parseUnits: PU, formatEther: FE}, provider } = ethers;
const pks = require('../../pks.json');
const { getSkillToken, getDeployGasPrice } = require("../lib");
const gasPrice = getDeployGasPrice(network.name);

const MaxAllowance = ethers.constants.MaxUint256;
async function main() {
  
  const UniswapUSDCSkill = await ethers.getContract('UniswapUSDCSkill');
  const snookPrice = await UniswapUSDCSkill.getSnookPriceInSkills();  
  console.log('snook price: ', FE(snookPrice) );

  for (let i=0; i<pks.length; i++) {
    const pk = pks[i];
    const gamer = new ethers.Wallet(pk, provider);
    console.log(`gamer address: ${gamer.address}, pk: ${pk}`);
    const SnookToken = await ethers.getContract('SnookToken', gamer);
    const SkillToken = await getSkillToken(gamer);
    const SnookGame = await ethers.getContract('SnookGame', gamer);
    const gamerMaticBalance = await provider.getBalance(gamer.address);
    console.log(`gamer Matic balance: ${FE(gamerMaticBalance)}`);
    if (gamerMaticBalance.lt(PE('0.005', 'ether'))) {
      console.log(`too low Matic balance, go next`);
      continue;
    }
    const gamerSkillBalance = await SkillToken.balanceOf(gamer.address);
    console.log(`gamer Skill balance: ${FE(gamerSkillBalance)}`);
    
    const tx1 = await SkillToken.approve(SnookGame.address, PE("20"), {gasPrice});
    console.log(`approve hash: ${tx1.hash}`);
    await tx1.wait(1);
    console.log('approve done');

    const tx2 = await SnookGame.mint2(1, {gasLimit: 2e6, gasPrice});
    console.log(`mint hash: ${tx2.hash}`);
    await tx2.wait(1);
    console.log('mint done');

    const gamerSnookBalance = await SnookToken.balanceOf(gamer.address);
    console.log(`gamer snook balance: ${gamerSnookBalance}`);
  }
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
