const ethers = require('ethers');
const vesting = require('../.vesting.json');
for (const plan in vesting) {
  for (const address of vesting[plan]) {
    if (address.startsWith('0x')) {
      try {
        const std = ethers.utils.getAddress(address);
        console.log(`plan: ${plan}, address: ${address}, std: ${std}`);
      } catch(err) {
        console.log(`error: ${err.message}, plan: ${plan}, address:${address}`);
      }
      
    }
    
  }
}