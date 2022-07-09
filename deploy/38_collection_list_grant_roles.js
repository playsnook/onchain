require('dotenv').config();
const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');

module.exports = async ({getNamedAccounts, deployments, network}) => {
  const { deployer, admin } = await getNamedAccounts();
  const gasPrice = getDeployGasPrice(network.name)
  const PAUSER_ROLE = await deployments.read(
    'CollectionList',
    {from:admin},
    'getPauserRole'
  );
  
  // Grant role to deployer
  await deployments.execute(
    'CollectionList',
    {from: admin, gasPrice},
    'grantRole',
    PAUSER_ROLE,
    deployer 
  );

  deployments.log(`CollectionList granted PAUSER role to deployer`);

  await delayBetweenDeployScripts();
  return true;
  
};
module.exports.tags = ['L2', 'mumbai'];
module.exports.id = 'CollectionListGrantsRoles';