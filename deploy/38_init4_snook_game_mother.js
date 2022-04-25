const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');
const logMessage = "SnookGame: initialize4 (mother network)";

module.exports = async ({getNamedAccounts, deployments, network}) => {
  const { deployer } = await getNamedAccounts();
  const gasPrice = getDeployGasPrice(network.name);

  const isBridged = false;
  const BurnSafeAddress = ethers.constants.AddressZero;
  await deployments.execute(
    'SnookGame',
    {
      from:deployer,
      gasPrice
    },
    'initialize4',
    isBridged, 
    BurnSafeAddress
  );
  deployments.log(logMessage);
  await delayBetweenDeployScripts();
  return true;
};
module.exports.tags = ['L2', 'mumbai', 'polygon'];
module.exports.id = 'init4SnookGameMother';
