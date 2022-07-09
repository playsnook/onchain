const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');
module.exports = async ({getNamedAccounts, deployments, network}) => {
  const { deployer } = await getNamedAccounts();
  const gasPrice = getDeployGasPrice(network.name);

  const Marketplace = await deployments.get('Marketplace');  
  
  await deployments.execute(
    'SnookState',
    {
      from:deployer,
      gasPrice
    },
    'initialize2',
    Marketplace.address,
  );
  deployments.log('SnookState: initialize2 (marketplace)');
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
module.exports.id = 'initSnookState2';
