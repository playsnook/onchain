require('dotenv').config();
const { delayBetweenDeployScripts, getMintTokenCIDs } = require('../scripts/lib');

module.exports = async ({getNamedAccounts, deployments}) => {
  const { deployer } = await getNamedAccounts();
  const PRGN = await deployments.get('PRNG');
  const MintTokenCIDs = getMintTokenCIDs();
  await deployments.execute(
    'SnookGame',
    {from:deployer},
    'initialize2',
    PRGN.address,
    MintTokenCIDs
  );
  deployments.log('SnookGame: initialize2()');
  await delayBetweenDeployScripts();
  return true;
};
module.exports.tags = ['L2', 'L2bridged', 'mumbai', 'polygon', 'exchaintest', 'exchainmain'];
module.exports.id = 'init2SnookGame';
