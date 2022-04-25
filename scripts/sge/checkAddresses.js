const ethers = require('ethers');
const { accounts } = require('./data.json');
for (const address of accounts) {
  if (address.startsWith('0x')) {
    try {
      const std = ethers.utils.getAddress(address);
      // console.log(`address: ${address}, std: ${std}`);
    } catch(err) {
      console.log(`error: ${err.message}, address:${address}`);
    }
  }
}