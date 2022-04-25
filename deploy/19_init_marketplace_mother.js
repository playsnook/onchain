
require('dotenv').config();
const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');
const MarketplaceSafeAddress = process.env.MARKETPLACE_SAFE_ADDRESS;
const MarketplaceFee = process.env.MARKETPLACE_FEE;
  
module.exports = async ({getNamedAccounts, deployments, network}) => {
  const { deployer } = await getNamedAccounts();
  const gasPrice = getDeployGasPrice(network.name);

  const SnookToken = await deployments.get('SnookToken');
  const SkillToken = await deployments.get('SkillToken');
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
    SkillToken.address,
    SnookState.address,
    MarketplaceSafeAddress,
    MarketplaceFee  
  );
  deployments.log('Marketplace: initialize()');
  await delayBetweenDeployScripts();
  return true;
};
module.exports.tags = ['L2', 'L2bridged', 'mumbai', 'polygon', 'exchaintest'];
module.exports.id = 'initMarketplace';
