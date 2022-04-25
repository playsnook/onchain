const hre = require("hardhat");
const {ethers} = hre;
const {getMintTokenCIDs} = require('../lib');
const mintTokenCIDs = getMintTokenCIDs();
const gasPrice = ethers.utils.parseUnits('50', 'gwei');
const gasLimit = 10000000;
const _ = require('lodash');
function chooseTokenURI() {
  const IPFS_URL_PREFIX = 'ipfs://';
  
  const BASE_COLORS = 0;
  const LENGHT_COLORS = 20;
  
  const BASE_PATTERNS = BASE_COLORS + LENGHT_COLORS;
  const LENGTH_PATTERNS = 20;

  const BASE_WEARABLE_UPPER_BODY = BASE_PATTERNS + LENGTH_PATTERNS;
  const LENGTH_WEARABLE_UPPER_BODY = 3;

  const BASE_WEARABLE_BOTTOM_BODY = BASE_WEARABLE_UPPER_BODY + LENGTH_WEARABLE_UPPER_BODY;
  const LENGTH_WEARABLE_BOTTOM_BODY = 3;

  const BASE_WEARABLE_UPPER_HEAD = BASE_WEARABLE_BOTTOM_BODY + LENGTH_WEARABLE_BOTTOM_BODY;
  const LENGTH_WEARABLE_UPPER_HEAD = 3;

  const BASE_WEARABLE_BOTTOM_HEAD = BASE_WEARABLE_UPPER_HEAD + LENGTH_WEARABLE_UPPER_HEAD;
  const LENGTH_WEARABLE_BOTTOM_HEAD = 3;

  const traitId = _.random(1, 27);
  let base = 0;
  let offset = 0;
  if (traitId>=1 && traitId<=5) {
    base = BASE_COLORS;
    offset = _.random(LENGHT_COLORS-1);
  }
  else if (traitId>=6 && traitId<=15) {
    base = BASE_PATTERNS;
    offset = _.random(LENGTH_PATTERNS-1);
  }
  else if (traitId>=16 && traitId<=18) {
    base = BASE_WEARABLE_UPPER_BODY;
    offset = _.random(LENGTH_WEARABLE_UPPER_BODY-1);
  }
  else if (traitId>=19 && traitId<=21) {
    base = BASE_WEARABLE_BOTTOM_BODY;
    offset = _.random(LENGTH_WEARABLE_BOTTOM_BODY-1);
  }
  else if (traitId >= 22 && traitId <= 24) {
    base = BASE_WEARABLE_UPPER_HEAD; // rnd[16,18]
    offset = _.random(LENGTH_WEARABLE_UPPER_HEAD-1);
  }

  else if (traitId >= 25 && traitId <= 27) {
    base = BASE_WEARABLE_BOTTOM_HEAD;
    offset = _.random(LENGTH_WEARABLE_BOTTOM_HEAD-1);
  }

  else { // exception 
  }

  const tokenURI = IPFS_URL_PREFIX + mintTokenCIDs[base+offset];
  return tokenURI;
} 

async function doBulkMint() {
  const tos = ['0xE947Fd5baB087e6077d0c7017ea36DC967d58c86'];
  const {sgeSender} = await ethers.getNamedSigners();
  const SGE = await ethers.getContract('SGE', sgeSender);
  const mintedCount = await SGE.getMintedCount();
  const maxTokenCount = 25000;
  const remainingMints = maxTokenCount - mintedCount.toNumber();
  console.log(`Remaing mints: ${remainingMints} maxTokenCount:${maxTokenCount} mintedCount: ${mintedCount}`);

  if (remainingMints <= 0) {
    console.log(`Already minted ${maxTokenCount}`);
    return;
  }
  
  const bulkSize = 30;
  const MaxBulk = Math.floor(remainingMints/bulkSize);
  for (let i=0; i<MaxBulk; i++) {
    console.log(`Bulk: ${i} of ${MaxBulk}`);
    const tokenURIs = [];
    for (let j=0; j<bulkSize; j++) {
      tokenURIs[j] = chooseTokenURI();
    }
    //const gasEstimate = await SGE.estimateGas.bulkMint(tos, [tokenURIs]);
    //console.log(`gasEstimage: ${ethers.utils.parseEther(gasEstimate)}`);

    console.log(tos, [tokenURIs]);
    const tx = await SGE.bulkMint(tos, [tokenURIs], {gasPrice, gasLimit});
    console.log(`txHash: ${tx.hash} txNonce: ${tx.nonce}`);
    await tx.wait(1);
    console.log(`Bulk ${i} is done`);
    //return; // <<< DEBUG
  }

  console.log(`finished with bulks`);

  if (remainingMints%bulkSize != 0) {
    console.log(`minting remaining available mints`);
    const tokenURIs = [];
    for (let i=0; i<remainingMints%bulkSize; i++) {
      tokenURIs[i] = chooseTokenURI();
    }
    console.log(tos, [tokenURIs]);
    const tx = await SGE.bulkMint(tos, [tokenURIs]);
    console.log(`txHash: ${tx.hash}`);
    await tx.wait(1);
  }
  console.log('All done');
}

async function main() {
  await doBulkMint();
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
