const assert = require("assert");
const hre = require("hardhat");
const { ethers, network } = hre;
console.log(`network: ${network.name}`)
async function main() {
  const { deployer } = await ethers.getNamedSigners();
  const sender = new ethers.Wallet(process.env.SENDER_PK, deployer.provider);
  const SnookTokenSender = await ethers.getContract('SnookToken', sender);
  const tokenId = process.env.GIFT_TOKEN_ID;
  const rcvrAddress = process.env.RCVR_ADDR;
  console.log(`Transferring: ${sender.address} --- ${tokenId} ----> ${rcvrAddress}`);
  
  const owner = await SnookTokenSender.ownerOf(tokenId);
  if (owner !== sender.address) {
    console.log(`${sender.address} is not owner of ${tokenId}`);
    const balance = await SnookTokenSender.balanceOf(sender.address);
    console.log(`Owned tokens (total: ${balance}):`);
    for (let i=0; i<balance; i++) {
      const tokenId = await SnookTokenSender.tokenOfOwnerByIndex(sender.address, i);
      console.log(tokenId.toString());
    }
    return;
  }
  
  const tx = await SnookTokenSender.transferFrom(sender.address, rcvrAddress, tokenId);
  console.log(`waiting, hash: ${tx.hash}`);
  await tx.wait(1);
  console.log(`Ok: ${sender.address} --- ${tokenId} ----> ${rcvrAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
