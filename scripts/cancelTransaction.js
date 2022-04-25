
const hre = require("hardhat");
const { ethers } = hre;
const gasPrice = ethers.utils.parseUnits('65', 'gwei');
const gasLimit = 10_000_000;
async function main() {
  // txHash to cancel
  const txHash = '0x523f59634a885e0affebdedb08b8125c18687c3b877ff1aa3b2bf7625a7bddcc';
  const { gravedigger: sender } = await ethers.getNamedSigners();
  console.log(`sender address: ${sender.address}`);
  const tx = await ethers.provider.getTransaction(txHash);
  const nonce = await ethers.provider.getTransactionCount(sender.address);
  const CancelByNonce = true;
  console.log('tx:', tx);
  console.log('nonce:', nonce);
  const replacementRequest = {
    to: CancelByNonce ? sender.address : tx.to,
    from: CancelByNonce ?  sender.address : tx.from,
    nonce: CancelByNonce ? nonce : tx.nonce,
    value: 0,
    gasPrice,
    gasLimit
  };
  const replacementTx = await sender.sendTransaction(replacementRequest);
  console.log(`replacement txHash: ${replacementTx.hash}`);
  await replacementTx.wait(1);
  console.log('Done');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
