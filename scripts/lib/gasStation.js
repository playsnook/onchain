// gasStation.js - gas price for cron scripts

require('dotenv').config();

const axios =  require('axios');
const hre = require("hardhat");
const { ethers } = hre;

async function getPolygonGasPrice(url, transactionSpeed) {
  // example of the response: https://docs.matic.network/docs/develop/tools/matic-gas-station/
  const { data } = await axios.get(url);
  const wei = ethers.BigNumber.from(data[transactionSpeed]).mul(10**9);
  return wei;
}

async function getGasPrice(networkName, transactionSpeed) {
  let price; // in wei
  switch(networkName) {
    case 'localhost': 
      const HardhatGasPriceDefault = '8000000000';
      price = ethers.BigNumber.from(HardhatGasPriceDefault);
      break;
    case 'mumbai':
      price = await getPolygonGasPrice('https://gasstation-mumbai.matic.today', transactionSpeed);
      break;
    case 'main':
      price = await getPolygonGasPrice('https://gasstation-mainnet.matic.network', transactionSpeed);
      break;
    default: 
      throw new Error('gasStation: unknown network');
  }
  return price;
}

module.exports = {
  getGasPrice
};