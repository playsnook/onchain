const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');
module.exports = async ({getNamedAccounts, deployments, network}) => {
  const { deployer } = await getNamedAccounts();
  const gasPrice = getDeployGasPrice(network.name);

  const SnookGame = await deployments.get('SnookGame');
  const Afterdeath = await deployments.get('Afterdeath');
  
  await deployments.execute(
    'SnookState',
    {
      from:deployer,
      gasPrice
    },
    'initialize',
    SnookGame.address,
    Afterdeath.address,
  );
  deployments.log('Initialized SnookState');
  await delayBetweenDeployScripts();
  return true;
};
module.exports.tags = ['L2', 'L2bridged', 'mumbai', 'polygon', 'exchaintest', 'exchainmain', 'skaletest'];
module.exports.id = 'initSnookState';
