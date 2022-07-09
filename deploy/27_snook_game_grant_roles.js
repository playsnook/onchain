require('dotenv').config();
const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');

module.exports = async ({getNamedAccounts, deployments, network}) => {
  const { deployer, admin } = await getNamedAccounts();
  const gasPrice = getDeployGasPrice(network.name)
  const KILLER_ROLE = await deployments.read(
    'SnookGame',
    {from:admin},
    'KILLER_ROLE'
  );

  const EXTRACTOR_ROLE = await deployments.read(
    'SnookGame',
    {from:admin},
    'EXTRACTOR_ROLE'
  );

  const EMERGENCY_EXTRACTOR_ROLE = await deployments.read(
    'SnookGame',
    {from:admin},
    'EMERGENCY_EXTRACTOR_ROLE'
  );
  
  // Grant role to deployer
  await deployments.execute(
    'SnookGame',
    {from: admin, gasPrice},
    'grantRole',
    KILLER_ROLE,
    deployer 
  );

  await deployments.execute(
    'SnookGame',
    {from: admin, gasPrice},
    'grantRole',
    EXTRACTOR_ROLE,
    deployer 
  );

  await deployments.execute(
    'SnookGame',
    {from: admin, gasPrice},
    'grantRole',
    EMERGENCY_EXTRACTOR_ROLE,
    deployer 
  );

  deployments.log(
`SnookGame granted roles to deployer:
  KILLER_ROLE: ${KILLER_ROLE}
`);
  await delayBetweenDeployScripts();
  return true;
  
};
module.exports.tags = ['L2', 'L2bridged'];
module.exports.id = 'SnookGameGrantsRoles';