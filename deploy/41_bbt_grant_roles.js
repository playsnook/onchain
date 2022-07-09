require('dotenv').config();

const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');

module.exports = async ({getNamedAccounts, deployments, network}) => {
  const { deployer, admin } = await getNamedAccounts();
  const gasPrice = getDeployGasPrice(network.name);
  const EXTRACTOR_ROLE = await deployments.read(
    'BigBoyTable',
    {from:admin},
    'getExtractorRole'
  );

  const EMERGENCY_EXTRACTOR_ROLE = await deployments.read(
    'BigBoyTable',
    {from:admin},
    'getEmergencyExtractorRole'
  );
  
  // Grant role to deployer
  await deployments.execute(
    'BigBoyTable',
    {from: admin, gasPrice},
    'grantRole',
    EXTRACTOR_ROLE,
    deployer 
  );

  await deployments.execute(
    'BigBoyTable',
    {from: admin, gasPrice},
    'grantRole',
    EMERGENCY_EXTRACTOR_ROLE,
    deployer 
  );

  deployments.log(`BBT granted EXTRACTOR role to deployer`);

  await delayBetweenDeployScripts();
  return true;
  
};
module.exports.tags = ['L2'];
module.exports.id = 'BigBoyTableGrantsRoles';