const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');

module.exports = async ({getNamedAccounts, deployments, network}) => {
  const { deployer, admin } = await getNamedAccounts();
  const gasPrice = getDeployGasPrice(network.name);
  const SkillToken = await deployments.get('SkillToken');
  await deployments.execute(
    'CollectionList',
    {from:deployer, gasPrice},
    'initialize',
    admin,
    SkillToken.address
  );
  deployments.log('Initialized CollectionList');
  await delayBetweenDeployScripts();
  return true;
};
module.exports.tags = ['L2', 'mumbai', 'polygon', 'skatetest'];
module.exports.id = 'initCollectionList';
