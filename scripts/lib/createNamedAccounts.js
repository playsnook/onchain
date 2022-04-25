const vesting = require('../../.vesting.json');
function createNamedAccounts() {
  let accIdx = 0;
  const namedAccounts = {
    deployer: accIdx++,
    gamer1: accIdx++,
    gamer2: accIdx++,
    gravedigger: accIdx++,
    treasurer: accIdx++,
    sgeSender: accIdx++,
  };
  namedAccounts['admin'] = {
    default: namedAccounts.deployer,
    137: process.env.ADMIN_ACCOUNT,
    80001: process.env.ADMIN_ACCOUNT,
    65: process.env.ADMIN_ACCOUNT,
    66: process.env.ADMIN_ACCOUNT
  }
  for (const planName in vesting) {
    for (let i=0; i<vesting[planName].length; i += 2) {
      const address = vesting[planName][i];
      if (address === 'TREASURY') {
        break;
      }
      // on hardhat network accounts are usual signers[0], ...
      // on specific networks they are given addresses specified in .vesting.json
      namedAccounts[address] = {
        default: accIdx++,
        137: address,
        80001: address,
        65: address,
        66: address,
      }
    }
  }
  return namedAccounts;  
}

module.exports = createNamedAccounts;
