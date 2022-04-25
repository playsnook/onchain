/**
 * This script goes block after block starting from around 2021-09-12 and ending on 2021-09-08.
 * It takes transactions fto SnookGame contract which are allowGame and enterGame function invokations.
 * From successful enterGame receipts we know tokens which surely entered the game.
 * From successful allowGame receipts we know addresses who own the tokens.
 * The output is snookId: address.
 * 
 * In case of failure: adjust blockNumber
 */


const startDatetime = '2021-09-08T00:00:00';
const endDatetime = '2021-09-12T12:00:00';

const startTimestamp = Math.floor((new Date(startDatetime)).getTime()/1000);
const endTimestamp = Math.floor((new Date(endDatetime)).getTime()/1000);

const startBlockNumber = 19013905;

async function getAddressesOfWhomEnteredTheGame() {
  const { deployer } = await ethers.getNamedSigners();
  const SnookGame = await ethers.getContract('SnookGame');
  // const iSnookGame = new ethers.utils.Interface(SnookGame.abi);

  const enterGameSelector = ethers.utils.id('enterGame(uint256,uint256)').slice(0,10);
  const allowGameSelector = ethers.utils.id('allowGame(uint256)').slice(0,10);
  console.log(`enterGame selector:${enterGameSelector}, allowGameSelector: ${allowGameSelector}`);

  let blockNumber = startBlockNumber;
  const snookIdsEntered = [];
  const snookIdsAllowedFrom = {};
  while (true) {
    const blockTxs = await deployer.provider.getBlockWithTransactions(blockNumber);
    if (blockTxs.timestamp > endTimestamp) {
      blockNumber -= 1;
      continue;
    }
    if (blockTxs.timestamp < startTimestamp) {
      break;
    }
    console.log(`blockNumber: ${blockNumber}, timestamp: ${blockTxs.timestamp} date: ${new Date(blockTxs.timestamp * 1000)} timeNow: ${new Date()}`);
    for (let tx of blockTxs.transactions) {
      if (tx.to === SnookGame.address) {
        if (tx.data.slice(0,10) === enterGameSelector) {
          const snookId = tx.data.slice(10, 10+32*2);
          snookIdsEntered.push(snookId)
          console.log(`Entered with snookId: ${parseInt(snookId, 16)} (${snookId})`)
          // console.log(tx);
        } else if (tx.data.slice(0,10) === allowGameSelector) {
          const snookId = tx.data.slice(10, 10+32*2);
          snookIdsAllowedFrom[snookId] = tx.from;
          console.log(`Allowed from ${tx.from} with snookId: ${parseInt(snookId, 16)} (${snookId})`);
        }
      } 
    }
    blockNumber -= 1;
  }

  for (let snookIdEntered of snookIdsEntered) {
    console.log(`snookIdEntered: ${snookIdEntered} allowedFrom: ${snookIdsAllowedFrom[snookIdEntered]}`);
  }
}

async function main() {
  await getAddressesOfWhomEnteredTheGame();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.  
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
