const { utils: {parseUnits: PU}} = ethers;
function getDeployGasPrice(networkName) {
  let price;
  switch(networkName) {
    case 'exchainmain':
      price = PU('1', 'gwei');
      break;
    case 'exchaintest':
      price = PU('1', 'gwei'); 
      break;
    case 'polygon':
      price = PU('80', 'gwei');
      break;
    case 'mumbai':
      price = PU('3', 'gwei');
      break;
    case 'hardhat':
      price = PU('8', 'gwei'); // default value
      break;
    default: 
      throw new Error(`getDeployGasPrice: Network undefined: ${networkName}`);
  }
  return price;
}
module.exports = getDeployGasPrice;