const { ethers } = require('hardhat');
const {abi: TokenTimelockAbi} = require('@openzeppelin/contracts/build/contracts/TokenTimelock.json');
const { provider, utils: {getAddress, formatEther: FE, parseEther: PE}, BigNumber} = ethers;
const startBlockNumber = 18643618; // contract creation
const endBlockNumber = 27300967; // current block

async function getBeneficiaries() {
  const { deployer } = await ethers.getNamedSigners();
  const StakingRewards = await ethers.getContract('StakingRewards');
  console.log(`stakingRewards address: ${StakingRewards.address}`);
  const depositEventSelector = ethers.utils.id('Deposit(address,address,uint256,uint256,uint256,uint256)');
  const depositFunctionSelector = ethers.utils.id('deposit(uint256,uint256)').slice(0,10);
  console.log(`depositEventSelector:${depositEventSelector} depositFunctionSelector: ${depositFunctionSelector}`);

  for (let blockNumber = startBlockNumber; blockNumber <= endBlockNumber; blockNumber++) {
    const blockTxs = await deployer.provider.getBlockWithTransactions(blockNumber);
    console.log(`blockNumber: ${blockNumber}, txs: ${blockTxs.transactions.length} blockDate: ${new Date(blockTxs.timestamp * 1000)} timeNow: ${new Date()}`);
    for (let tx of blockTxs.transactions) {
      if (tx.to === StakingRewards.address) {
        if (tx.data.slice(0,10) === depositFunctionSelector) {
          const {logs} = await provider.getTransactionReceipt(tx.hash);
          for (const log of logs) {
            if (log.topics && log.topics.length >= 1 && log.topics[0] === depositEventSelector) {
              const bene = getAddress(log.data.slice(2, 64*1+2).slice(-40));
              const tokenTimelock = getAddress(log.data.slice(64*1+2, 64*2+2).slice(-40));
              const depositAmount = '0x' + log.data.slice(64*2+2, 64*3+2);
              const TokenTimelock = await ethers.getContractAt(TokenTimelockAbi, tokenTimelock);
              const releaseTime = await TokenTimelock.releaseTime();
              const releaseDate = new Date(releaseTime*1000);
              const nowTime = Date.now();
              const nowDate = new Date(nowTime);
              const canRelease = nowTime >= releaseTime;
              const depositAmountInSNK = FE(BigNumber.from(depositAmount));
              console.log(`deposit:${tx.hash}|${tokenTimelock}|${bene}|${depositAmountInSNK}|${canRelease}|${releaseDate}|${releaseTime}|${nowDate}|${nowTime}`);
              try {
                const releaseTx = await TokenTimelock.release();
                console.log(`release hash: ${releaseTx.hash}`);
                await releaseTx.wait(1);
                console.log(`released`);
              } catch(err) {
                console.log(err)
              }
              console.log('------------------------------');
              
            }
          }
        }
      } 
    }
  }

  
}

async function main() {
  await getBeneficiaries();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.  
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
