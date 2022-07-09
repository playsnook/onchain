require('dotenv').config();
const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');
const { Ecosystem: [EcosytemAddress ]} = require('../.vesting.json');
module.exports = async ({getNamedAccounts, deployments, network}) => {
  const { deployer } = await getNamedAccounts();
  const gasPrice = getDeployGasPrice(network.name);

  const Treasury = await deployments.get('Treasury');
  
  await deployments.execute(
    'SnookGame',
    {
      from:deployer,
      gasPrice,
    },
    'initialize3',
    EcosytemAddress,
    Treasury.address
  );
  deployments.log('SnookGame: initialize3()');
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
module.exports.id = 'init3SnookGame';
