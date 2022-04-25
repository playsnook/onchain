// Script goes over all living snook tokens and discovers the ones which should be placed into 
// SnookGame.fixPeriod2TokenStars()
const hre = require("hardhat");
const { ethers, getNamedAccounts } = hre;

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
    const descriptors = await Promise.all(tokenIds.map(id=>SnookGame.describe(id)));
    const stars = descriptors.map(d=>d.stars);
    const onResurrectionStars = descriptors.map(d=>d.onResurrectionStars);
    const resurrectionCount = descriptors.map(d=>d.resurrectionCount);
    idxStart = idxEnd;
    console.timeEnd('bulk');
    for (let i=0; i<idxBulk.length; i++) {
      console.log(`all: i: ${idxBulk[i]} id: ${tokenIds[i]} stars: ${stars[i]} resStars: ${onResurrectionStars[i]} resCount: ${resurrectionCount[i]}`);
      if (stars[i] > 4) {
        console.log(`selected: ${tokenIds[i]}`);
      }
    }
  }
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
