
require('dotenv').config();
const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');
const MarketplaceSafeAddress = process.env.MARKETPLACE_SAFE_ADDRESS;
const MarketplaceFee = process.env.MARKETPLACE_FEE;
const addresses = require('../addresses.json');

module.exports = async ({getNamedAccounts, deployments, network}) => {
  const { deployer } = await getNamedAccounts();
  const gasPrice = getDeployGasPrice(network.name);

  const SnookToken = await deployments.get('SnookToken');
  const SkillTokenAddress = addresses[network.name].Anyswap.ContractAddress;
  const SnookState = await deployments.get('SnookState');
  await deployments.execute(
    'Marketplace',
    {
      from:deployer,
      gasLimit: 4_000_000,
      gasPrice
    },
    'initialize',
    SnookToken.address,
    SkillTokenAddress,
    SnookState.address,
    MarketplaceSafeAddress,
    MarketplaceFee  
  );
  deployments.log('Marketplace bridged: initialize()');
  await delayBetweenDeployScripts();
  return true;
};
module.exports.tags = ['exchainmain'];
module.exports.id = 'initMarketplaceBridged';
