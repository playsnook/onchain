// Script goes over all living snook tokens and discovers the ones which should be placed into 
// SnookGame.fixPeriod2TokenStars()
const hre = require("hardhat");
const { ethers, getNamedAccounts } = hre;
const { getMintTokenCIDs } = require('./lib');
const mintTokenCIDs = getMintTokenCIDs();

async function main() {
  const { deployer } = await getNamedAccounts();
  const SnookToken = await ethers.getContract('SnookToken', deployer);
  const SnookGame = await ethers.getContract('SnookGame', deployer);
  const TotalSupply = await SnookToken.totalSupply();
  const MaxIdx = TotalSupply.toNumber();  

  const BulkSize = 100;
  console.log(`totalSupply: ${MaxIdx}`);
  const AllIndexes = [ ... Array(MaxIdx).keys()];
  let done = false;
  let idxStart = 0;
  let idxEnd = 0; 
  const cids = [];
  while (!done) {
    console.time('bulk');
    idxEnd = idxStart + BulkSize;
    console.log(`idxStart: ${idxStart} idxEnd: ${idxEnd}`);
    const idxBulk = AllIndexes.slice(idxStart, idxEnd);
    console.log(`bulkSize: ${idxBulk.length}`)
    if (idxBulk.length < BulkSize) {
      done = true;
    }
    const tokenIds = await Promise.all(idxBulk.map(idx=>SnookToken.tokenByIndex(idx)));
    const tokeURIs = await Promise.all(tokenIds.map(id=>SnookToken.tokenURI(id)));
    const bulkCIDs = tokeURIs.map(uri=>uri.split('ipfs://')[1]);
    cids.push(...bulkCIDs);
    idxStart = idxEnd;
    console.timeEnd('bulk');
  }

  const indexes = cids.map(cid => mintTokenCIDs.indexOf(cid));
  const total = indexes.length;
  const colors = indexes.filter(i => i>=0 && i<=19);
  const colorFrac = Math.round(colors.length / total * 100);

  const patterns = indexes.filter(i => i>=20 && i<=39);
  const patternFrac = Math.round(patterns.length / total * 100);

  const wearables = indexes.filter(i => i>=40 && i<=51);
  const wearableFrac = Math.round(wearables.length / total * 100);


  console.log(colorFrac, patternFrac, wearableFrac);
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
