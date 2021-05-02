require("@nomiclabs/hardhat-waffle");
require('hardhat-deploy');

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  namedAccounts: {
    deployer: 0,
    gamer1: 1,
    gamer2: 2
  }, 
  networks: {
    // to disable 'Error: Transaction reverted: trying to deploy a contract whose code is too large'
    // solution from: https://github.com/nomiclabs/hardhat/issues/660
    hardhat: { 
      gas: 12000000,
      blockGasLimit: 0x1fffffffffffff,
      allowUnlimitedContractSize: true,
      timeout: 1800000
    }
  },
  solidity: {
    compilers: [
      {
        version: '0.6.6'
      },
      {
        version: '0.8.0'
      },
      
    ]
  }
};

