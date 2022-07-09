
require('dotenv').config();
const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');
const SnookTokenName = process.env.SNOOK_TOKEN_NAME;
const SnookTokenSymbol = process.env.SNOOK_TOKEN_SYMBOL;

module.exports = async ({getNamedAccounts, deployments, network}) => {
  const { deployer } = await getNamedAccounts();
  const gasPrice = getDeployGasPrice(network.name);

  const SnookGame = await deployments.get('SnookGame');
  const Afterdeath = await deployments.get('Afterdeath');
  //const SGE = await deployments.get('SGE');
  await deployments.execute(
    'SnookToken',
    {
      from:deployer,
      gasLimit: 4_000_000,
      gasPrice,
    },
    'initialize',
    SnookGame.address,
    Afterdeath.address,
    SnookTokenName,
    SnookTokenSymbol
  );
  deployments.log('SnookToken: initialize()');
  await delayBetweenDeployScripts();
  return true;
};
module.exports.tags = ['L2', 'L2bridged', 'mumbai', 'polygon', 'exchaintest', 'exchainmain', 'skaletest'];
module.exports.id = 'initSnookToken';
