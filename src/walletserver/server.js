const ethers = require('ethers');
const axios = require('axios');

const SnookGameArtifact = require('../../artifacts/contracts/SnookGame.sol/SnookGame.json');
const SnookGameAddress = '0x610178dA211FEF7D417bC0e6FeD39F05609AD788';

const provider = new ethers.providers.JsonRpcProvider(" http://127.0.0.1:8545/");
const signer = provider.getSigner();
const snookGame = new ethers.Contract(SnookGameAddress, SnookGameArtifact.abi, signer);
snookGame.on('RequestMint', async (to) => {
  console.log(`Request of minting to address ${to}`);
  console.log(await signer.getAddress())


  // here we request game server for new traits
  const traitIds = [1];
  const tokenURI = 'http://tokenUri';
  await snookGame.mint(to, traitIds, tokenURI);
});

snookGame.on('Entrance', (owner, tokenId)=>{
  const d = await snookGame.describe(tokenId);
})