const { ethers } = require('hardhat');
const pinataSDK = require('@pinata/sdk');
const tmp = require('tmp-promise');
const fs = require('fs');
const Chance = require('chance')

// contracts
let game; 
let snook; 
let skill;
let uniswap;
// signers
let signers;

const { b64 } = require('./mockdata/image.json');
const NetworkName = 'ropsten';
const { address: UniswapUSDCSkillAddr } = require(`../deployments/${NetworkName}/UniswapUSDCSkill.json`);
const { address: SkillAddr } = require(`../deployments/${NetworkName}/SkillToken.json`);
const { address: SnookAddr } = require(`../deployments/${NetworkName}/SnookToken.json`);
const { address: GameAddr } = require(`../deployments/${NetworkName}/SnookGame.json`);

const SnookObjects = [
  require('./mockdata/snook01.json'),
  require('./mockdata/snook02.json'),
  require('./mockdata/snook03.json'),
];

const chance = new Chance();
const pinata = pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_API_SECRET);

async function base64ToIPFS(b64) {
  const { path, cleanup } = await tmp.file();
  await fs.promises.writeFile(path, Buffer.from(b64, 'base64'));
  const rs = fs.createReadStream(path);
  const result = await pinata.pinFileToIPFS(rs);
  cleanup();
  return result;
}

async function createSnookResourcesOnIPFS(cardImageB64, inGameImageB64, snookObject) {
  const cardImageIPFS = await base64ToIPFS(cardImageB64);
  const inGameImageIPFS = await base64ToIPFS(inGameImageB64);
  // https://docs.opensea.io/docs/metadata-standards

  const openseaMetadata = {
    description: 'Snook',
    external_url: 'https://playsnook.com',
    image: `https://gateway.pinata.cloud/ipfs/${cardImageIPFS.IpfsHash}`,
    name: 'Snook name',
    // end of opensea fields
    inGameImage: `https://gateway.pinata.cloud/ipfs/${inGameImageIPFS.IpfsHash}`,
    snookObject,
  };
  const metadataIPFS = await pinata.pinJSONToIPFS(openseaMetadata);
  const openseaIpfsTokenURI = `ipfs://${metadataIPFS.IpfsHash}`;
  return openseaIpfsTokenURI; // accroding to OpenSea requirements
}

// Function of WS
async function wsMint(to, cardImageB64, inGameImageB64, snookObject) {
  const {
    traits,
    stars,
    score = 0,
  } = snookObject;

  const traitCount = traits.length;
  const tokenURI = await createSnookResourcesOnIPFS(cardImageB64, inGameImageB64, snookObject);
  console.log(`to:${to}, traitCount: ${traitCount}, stars:${stars}, score: ${score}, tokenURI:${tokenURI}`)
  const tx = await game.mint(
    to,
    ethers.BigNumber.from(traitCount),
    ethers.BigNumber.from(stars),
    ethers.BigNumber.from(score),
    tokenURI,
    { gasLimit: 2500000}
  );
  await tx.wait(2);
}

async function init() {
  signers = await ethers.getSigners();
  for (const signer of signers) {
    const balance = await signer.getBalance();
    console.log(signer.address, ethers.utils.formatUnits(balance));
  }

  const Game = await ethers.getContractFactory('SnookGame');
  game = await Game.attach(GameAddr);

  const Snook = await ethers.getContractFactory('SnookToken');
  snook = await Snook.attach(SnookAddr);

  const Skill = await ethers.getContractFactory('SkillToken');
  skill = await Skill.attach(SkillAddr);

  const Uniswap = await ethers.getContractFactory('UniswapUSDCSkill');
  uniswap = await Uniswap.attach(UniswapUSDCSkillAddr);
}

async function buy() {
  // buys a snook for signer1
  const snookPrice1 = await uniswap.getSnookPriceInSkills();
  await skill.connect(signers[1]).approve(game.address, snookPrice1);
  await wsMint(
    signers[1].address, 
    b64, 
    b64, 
    SnookObjects[chance.integer({min:0,max:2})]
  );

  const myTokensCount = await snook.connect(signers[1]).balanceOf(signers[1].address);
  const myTokenId = await snook.connect(signers[1]).tokenOfOwnerByIndex(signers[1].address, myTokensCount-1);
  console.log(`myTokenId: ${myTokenId}`);
}

async function enterGameDieRessurect() {
  // enters game with the last token of signer1, the token dies and ressurected
  const tokenCount = await snook.connect(signers[1]).balanceOf(signers[1].address);
  console.log(`tokenCount: ${tokenCount}`);
  const tokenId = await snook.connect(signers[1]).tokenOfOwnerByIndex(signers[1].address, tokenCount-1);
  console.log(`tokenId: ${tokenId}`);
  const { ressurectionCount } = await game.connect(signers[1]).describe(tokenId);
  console.log(`ressurectionCount: ${ressurectionCount}`);
  const tx1 = await game.connect(signers[1]).allowGame(tokenId);
  await tx1.wait(1);
  console.log('Game allowed');
  const tx2 = await game.enterGame(tokenId, ressurectionCount);
  await tx2.wait(1);
  console.log('Game entered');
  const tokenURI = await snook.tokenURI(1);
  console.log(`tokenURI: ${tokenURI}`);
  const tx3 = await game.setDeathTime(tokenId, 0, 0, 0, tokenURI);
  await tx3.wait(1);
  console.log('Snook is dead');
  const { ressurectionPrice } = await game.connect(signers[1]).describe(tokenId);
  console.log(`ressurection price: ${ethers.utils.formatEther(ressurectionPrice)} ethers`);
  const tx4 = await skill.connect(signers[1]).approve(game.address, ressurectionPrice, {
    gasLimit: 2500000
  });
  await tx4.wait(1);
  console.log('game is approved for taking SKILL for ressurection');
  const tx5 = await game.connect(signers[1]).ressurect(tokenId, {
    gasLimit: 2500000
  });
  await tx5.wait(1);
  console.log('ressurected');
}

async function ressurect(tokenId) {
  // ressurects tokenId of signer1
  const { ressurectionPrice } = await game.connect(signers[1]).describe(tokenId);
  console.log(`ressurection price: ${ethers.utils.formatEther(ressurectionPrice)} ethers`);
  const tx4 = await skill.connect(signers[1]).approve(game.address, ressurectionPrice, {
    gasLimit: 3500000
  });
  await tx4.wait(1);
  console.log('game is approved for taking SKILL for ressurection');
  const tx5 = await game.connect(signers[1]).ressurect(tokenId, {
    gasLimit: 3500000
  });
  await tx5.wait(1);
  console.log('ressurected');
}

async function main() {
  await init();
  //await buy();
  //await enterGameDieRessurect();
  await ressurect(13);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });