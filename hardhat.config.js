require('dotenv').config();
require("@nomiclabs/hardhat-waffle");
require('hardhat-deploy');
// require('hardhat-contract-sizer');
// require("hardhat-gas-reporter");


// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();
  for (const account of accounts) {
    console.log(`${account.address}`);
  }
});

task("accounts", "Prints the list of named accounts", async () => {
  const accounts = await ethers.getSigners();
  for (const account of accounts) {
    console.log(`${account.address}`);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  },
  namedAccounts: {
    deployer: 0,
    gamer1: 1,
    gamer2: 2
  }, 
  
  networks: {
    mumbai: {
      url: 'https://rpc-mumbai.maticvigil.com/v1/9a217604b15501748162f79b139336db98d1cdff',
      accounts: [ // private keys of the accounts; namedAccounts fit this array
        process.env.PK1,
        process.env.PK2,
        process.env.PK3
      ]
    }
  },

  solidity: {
    compilers: [
      {
        version: '0.6.6',
        optimizer: {
          enabled: true,
          runs: 1000
        }
      },
      {
        version: '0.8.0',
        optimizer: {
          enabled: true,
          runs: 1000
        }
      },
      
    ]
  }
};

