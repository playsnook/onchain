
require('dotenv').config();
const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');

module.exports = async ({getNamedAccounts, deployments, network}) => {
  const { deployer } = await getNamedAccounts();
  const gasPrice = getDeployGasPrice(network.name);

  const Marketplace = await deployments.get('Marketplace');
  
  await deployments.execute(
    'SnookToken',
    {
      from:deployer,
      gasLimit: 4_000_000,
      gasPrice
    },
    'initialize3',
    Marketplace.address
  );
  deployments.log('SnookToken: initialize3() (marketplace)');
  await delayBetweenDeployScripts();
  return true;
};
module.exports.tags = [
  'L2', 
  'L2bridged', 
  'mumbai', 
  'polygon', 
  'exchaintest', 
  'exchainmain',
  'skaletest'
];
module.exports.id = 'init3SnookToken';
