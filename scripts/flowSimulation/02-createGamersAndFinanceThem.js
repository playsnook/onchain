const assert = require("assert");
const hre = require("hardhat");
const { ethers, network } = hre;
const { utils: {parseEther: PE, parseUnits: PU, formatEther: FE}, provider } = ethers;
const pks = require('../../pks.json');
const { getSkillToken } = require("../lib");
const N=2;
assert(pks.length === 0 || pks.length > 0 && pks.length === N, 'Invalid pks array');

/**
 * 
 * @param {Signer} from - signer which sends matic
 * @param {string} addrTo - address of the recipient 
 * @param {number} amountInEther - amount of matic to send
 */
async function sendMatic(from, addrTo, amountInEther) {
  const txRequest = {
    from: from.address,
    to: addrTo,
    value: PE(amountInEther.toString())
  }
  const tx = await from.sendTransaction(txRequest);
  console.log(`Sending ${amountInEther} MATIC to ${addrTo}: hash: ${tx.hash}`);
  await tx.wait(1);
  console.log('Matic sent');
}


async function main() {
  const deployer = await ethers.getNamedSigner('deployer');
  const SkillToken = await getSkillToken(deployer);
  
  const deployerMaticBalance = await deployer.getBalance();
  const deployerSkillBalance = await SkillToken.balanceOf(deployer.address);
  console.log(`deployer: address: ${deployer.address} skillBalance: ${FE(deployerSkillBalance)} maticBalance: ${FE(deployerMaticBalance)}`);
  for (let i=0; i<N; i++) {
    let address;
    let privateKey;
    if (pks.length === 0) {
      ({ address, privateKey } = new ethers.Wallet.createRandom());
    } else {
      privateKey = pks[i];
      ({address} = new ethers.Wallet(privateKey));
    }
    
    await sendMatic(deployer, address, 0.01);
    const tx = await SkillToken.transfer(address, PE("5"));
    console.log(`sendSkill: tx hash: ${tx.hash}`);
    await tx.wait(1);
    console.log('Skill sent');
    console.log(`"${address}","${privateKey}",`);
  }
  
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
