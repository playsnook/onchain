const hre = require("hardhat");
const { ethers, getNamedAccounts } = hre;
const { utils: {formatEther: FE, parseUnits: PU, formatUnits: FU}}  = ethers;
const { getGasFees } = require('./lib');
let Afterdeath;

async function main() {
  const { gravedigger: deployer } = await getNamedAccounts()
  Afterdeath = await ethers.getContract('Afterdeath', deployer);
  const gasLimit = 15_000_000;
  const bulkSize = 50;
  const gasPrice = ethers.utils.parseUnits('60', 'gwei');
  const nonce = await ethers.provider.getTransactionCount(deployer);
  const balanceOfDeployer = await ethers.provider.getBalance(deployer);
  console.log(`effective gravadigger: ${deployer} nonce: ${nonce} balance: ${ethers.utils.formatEther(balanceOfDeployer)}`);
  
  const morgueLength = await Afterdeath.getMorgueLength();
  const removedLength = await Afterdeath.getRemovedFromMorgueLength();
  console.log(`${Date.now()} removed: ${removedLength} morgue: ${morgueLength}`);

  const gasEstimate = await Afterdeath.estimateGas.bury(bulkSize, {
    gasLimit, 
    gasPrice, 
  });
  const feeEstimate = gasEstimate.mul(gasPrice);
  console.log(`gasPrice: ${FU(gasPrice, 'gwei')} gwei, gas estimate: ${gasEstimate}, feeEstimate: ${FE(feeEstimate)} ether`);
  
  const tx = await Afterdeath.bury(bulkSize, {
    gasLimit, 
    gasPrice, 
    // nonce: 31139
  });
  
  console.log(`${Date.now()} tx: ${tx.hash} nonce: ${tx.nonce} price: ${ethers.utils.formatUnits(tx.gasPrice, 'gwei')}`);
  const r = await tx.wait(1);
  console.log(`${Date.now()} gasUsed: ${r.gasUsed}`);

  const newRemovedLength = await Afterdeath.getRemovedFromMorgueLength();
  const snooksRemoved = newRemovedLength.sub(removedLength);
  console.log(`${Date.now()} removedLength: ${removedLength} new: ${newRemovedLength}, snooks removed: ${snooksRemoved.toNumber()}`);
  setTimeout(main, 0 /*2*60*1000*/);
}

main();
