require('dotenv').config();
const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');
module.exports = async ({getNamedAccounts, deployments, network}) => {
  const { deployer } = await getNamedAccounts();
  const gasPrice = getDeployGasPrice(network.name);

  const SnookGame = await deployments.get('SnookGame');
  const Afterdeath = await deployments.get('Afterdeath');
  
  await deployments.execute(
    'Treasury',
    {
      from:deployer,
      gasLimit: 4_000_000,
      gasPrice,
    },
    'initialize2',
    SnookGame.address,
    Afterdeath.address
  );
  deployments.log('Treasury: init2');
  await delayBetweenDeployScripts();
  return true;
};
module.exports.tags = ['L2', 'L2bridged', 'mumbai', 'polygon', 'exchaintest', 'exchainmain', 'skaletest'];
module.exports.id = "initTreasury2";