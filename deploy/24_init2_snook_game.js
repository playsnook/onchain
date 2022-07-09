require('dotenv').config();
const { delayBetweenDeployScripts, getMintTokenCIDs, getDeployGasPrice } = require('../scripts/lib');

module.exports = async ({getNamedAccounts, deployments, network}) => {
  const { deployer } = await getNamedAccounts();
  const gasPrice = getDeployGasPrice(network.name)
  const PRGN = await deployments.get('PRNG');
  const MintTokenCIDs = getMintTokenCIDs();
  await deployments.execute(
    'SnookGame',
    {from:deployer, gasPrice},
    'initialize2',
    PRGN.address,
    MintTokenCIDs
  );
  deployments.log('SnookGame: initialize2()');
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
module.exports.id = 'init2SnookGame';
