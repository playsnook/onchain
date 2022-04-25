
const UniswapV2FactoryArtifact = require('@uniswap/v2-core/build/UniswapV2Factory.json');
const UniswapV2Router02Artifact = require('@uniswap/v2-periphery/build/UniswapV2Router02.json');


const QuickswapV2FactoryArtifact = require('quickswap-core/build/UniswapV2Factory.json');
const QuickswapV2Router02Artifact = require('QuickSwap-periphery/build/UniswapV2Router02.json');

const hre= require('hardhat');
const { ethers} = hre;

async function testUniswapV2Factory(UniswapV2Factory) {
  const allPairsLength = await UniswapV2Factory.allPairsLength();
  console.log(allPairsLength.toString());
}

async function testUniswapRouter02(UniswapRouter02) {
  const factoryAddr = await UniswapRouter02.factory();
  console.log(factoryAddr)
}

async function main() {

  const UniswapV2FactoryAddr = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
  const UniswapRouter02Addr = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
  const UniswapV2Factory = await ethers.getContractAt(UniswapV2FactoryArtifact.abi, UniswapV2FactoryAddr);
  const UniswapV2Router02 = await ethers.getContractAt(UniswapV2Router02Artifact.abi, UniswapRouter02Addr);
  
  // https://polygonscan.com/address/0x5757371414417b8c6caad45baef941abc7d3ab32#code
  const QuickswapV2FactoryAddr = '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32';
  // https://polygonscan.com/address/0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff#code
  const QuickswapRouter02Addr = '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff';
  const QuickswapV2Factory = await ethers.getContractAt(QuickswapV2FactoryArtifact.abi, QuickswapV2FactoryAddr);
  const QuickswapV2Router02 = await ethers.getContractAt(QuickswapV2Router02Artifact.abi, QuickswapRouter02Addr);
 
  
  switch(hre.network.name) {
    case 'ropsten':
      await testUniswapV2Factory(UniswapV2Factory);
      await testUniswapRouter02(UniswapV2Router02);
      break;
    case 'mumbai':
      await testUniswapV2Factory(QuickswapV2Factory);
      await testUniswapRouter02(QuickswapV2Router02);
      break;
  }

  

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
