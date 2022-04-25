const axios = require('axios');
const hre = require("hardhat");
const { ethers } = hre;

const loadtest = require('../loadtest.forRead.json');
async function main() {
  const deployer = await ethers.getNamedSigner('deployer');
  const SkillToken = await ethers.getContract('SkillToken');
  const SnookToken = await ethers.getContract('SnookToken');
  let count = 0;
  for (let i=0; i<loadtest.length; i+=2) {
    const address = loadtest[i];
    const skill = await SkillToken.balanceOf(address);
    const snookBalance = await SnookToken.balanceOf(address);
    const snookIds = [];
    const tokenURIs = [];
    for (let i=0; i<snookBalance; i++) {
      const snookId = await SnookToken.tokenOfOwnerByIndex(address, i);
      const tokenURI = await SnookToken.tokenURI(snookId);
      snookIds.push(snookId);
      tokenURIs.push(tokenURI);
      const hash = tokenURI.split('ipfs://')[1];
      const {data} = await axios.get(`https://ipfs.playsnook.com/ipfs/${hash}`);
      const {snookObject} = data;
      console.log(`${hash},${snookObject.traits[0]}`);
      count++;
    }
    // const matic = await deployer.provider.getBalance(address);
    // console.log(`address: ${address} skill: ${skill} snooks: ${snookBalance} matic: ${ethers.utils.formatEther(matic)} uris: ${JSON.stringify(tokenURIs)}`);
  }
  console.log(`counter: ${count}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
