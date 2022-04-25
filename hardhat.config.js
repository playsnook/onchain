require('dotenv').config();
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require('hardhat-deploy');
require("hardhat-deploy-ethers");

// require('hardhat-contract-sizer');
// require("hardhat-gas-reporter");

const createNamedAccounts = require('./scripts/lib/createNamedAccounts');
// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
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
  namedAccounts: createNamedAccounts(),
  networks: {
    mainnet: { // branch: master
      url: process.env.CHAINSTACK_RPC_MAINNET,
      accounts: [ // private keys of the accounts; namedAccounts fit this array
        process.env.PK1,
        process.env.PK2,
        process.env.PK3,
        process.env.GRAVEDIGGER_PK,
        process.env.TREASURER_PK,
        process.env.SGE_SENDER_PK
      ]
    },
    polygon: { // branch: master
      // url: `https://rpc-mumbai.maticvigil.com/v1/${process.env.MATIC_APP_KEY}`,
      // url: 'https://matic-mumbai.chainstacklabs.com',
      // url: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_APP_KEY}`,
      url: process.env.QUICKNODE_RPC,
      accounts: [ // private keys of the accounts; namedAccounts fit this array
        process.env.PK1,
        process.env.PK2,
        process.env.PK3,
        process.env.GRAVEDIGGER_PK,
        process.env.TREASURER_PK,
        process.env.SGE_SENDER_PK
      ]
    },
    mumbai: { // branch: development
      // url: `https://rpc-mumbai.maticvigil.com/v1/${process.env.MATIC_APP_KEY}`,
      // url: 'https://matic-mumbai.chainstacklabs.com',
      url: process.env.QUICKNODE_RPC,
      accounts: [ // private keys of the accounts; namedAccounts fit this array
        process.env.PK1,
        process.env.PK2,
        process.env.PK3,
        process.env.GRAVEDIGGER_PK,
        process.env.TREASURER_PK,
        process.env.SGE_SENDER_PK,
      ]
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_APP_KEY}`,
      accounts: [ // private keys of the accounts; namedAccounts fit this array
        process.env.PK1,
        process.env.PK2,
        process.env.PK3,
        process.env.GRAVEDIGGER_PK,
        process.env.TREASURER_PK,
        process.env.SGE_SENDER_PK
      ]
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${process.env.INFURA_APP_KEY}`,
      accounts: [ // private keys of the accounts; namedAccounts fit this array
        process.env.PK1,
        process.env.PK2,
        process.env.PK3,
        process.env.GRAVEDIGGER_PK,
        process.env.TREASURER_PK,
        process.env.SGE_SENDER_PK
      ]

    },
    kovan: {
      url: `https://kovan.infura.io/v3/${process.env.INFURA_APP_KEY}`,
      accounts: [ // private keys of the accounts; namedAccounts fit this array
        process.env.PK1,
        process.env.PK2,
        process.env.PK3,
        process.env.GRAVEDIGGER_PK,
        process.env.TREASURER_PK,
        process.env.SGE_SENDER_PK
      ]
    },
    exchaintest: {
      url: 'https://exchaintestrpc.okex.org/',
      accounts: [ // private keys of the accounts; namedAccounts fit this array
        process.env.PK1,
        process.env.PK2,
        process.env.PK3,
        process.env.GRAVEDIGGER_PK,
        process.env.TREASURER_PK,
        process.env.SGE_SENDER_PK
      ]
    },
    exchainmain: {
      url: 'https://exchainrpc.okex.org/',
      accounts: [ // private keys of the accounts; namedAccounts fit this array
        process.env.PK1,
        process.env.PK2,
        process.env.PK3,
        process.env.GRAVEDIGGER_PK,
        process.env.TREASURER_PK,
        process.env.SGE_SENDER_PK
      ],
      companionNetworks: {
        polygon: "polygon"
      }
    }

  },

  solidity: {
    compilers: [
      {
        version: '0.6.6',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
        
      },
      {
        version: '0.8.0',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          },
          outputSelection: {
            "*": {
              "*": [
               "evm.assembly"
              ]
            }
          }
        }
      },
      
    ]
  },

  etherscan: {
    apiKey: process.env.POLYGON_TOKEN
    // apiKey: {
    //   mainnet: process.env.ETHERSCAN_TOKEN,
    //   ropsten: process.env.ETHERSCAN_TOKEN,
    //   goerli: process.env.ETHERSCAN_TOKEN,
    //   kovan: process.env.ETHERSCAN_TOKEN,
    //   rinkby: process.env.ETHERSCAN_TOKEN,
    //   polygon : process.env.POLYGON_TOKEN,
    //   polygonMumbai : process.env.POLYGON_TOKEN
    // },
  }
};
