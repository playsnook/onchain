const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');
const logMessage = "SnookGame: initialize4 (bridged network)";

module.exports = async ({getNamedAccounts, deployments, network}) => {
  const { deployer } = await getNamedAccounts();
  const isBridged = true;
  const BurnSafe = await deployments.get('BurnSafe');
  const gasPrice = getDeployGasPrice(network.name);

  await deployments.execute(
    'SnookGame',
    {
      from:deployer,
      gasPrice
    },
    'initialize4',
    isBridged,
    BurnSafe.address
  );
  deployments.log(logMessage);
  await delayBetweenDeployScripts();
  return true;
};
module.exports.tags = ['L2bridged', 'exchainmain'];
module.exports.id = 'init4SnookGameBridged';
