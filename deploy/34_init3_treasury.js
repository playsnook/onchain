require('dotenv').config();
const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');

module.exports = async ({getNamedAccounts, deployments, network}) => {
  const { deployer } = await getNamedAccounts();
  const gasPrice = getDeployGasPrice(network.name);

  const SnookToken = await deployments.get('SnookToken');
  const UniswapUSDCSkill = await deployments.get('UniswapUSDCSkill');
  const LuckWheel = await deployments.get('LuckWheel');
  
  await deployments.execute(
    'Treasury',
    {
      from:deployer,
      gasLimit: 4_000_000,
      gasPrice,
    },
    'initialize3',
    LuckWheel.address,
    UniswapUSDCSkill.address,
    SnookToken.address
  );
  deployments.log('Treasury: init3');
  await delayBetweenDeployScripts();
  return true;
};
module.exports.tags = ['L2', 'L2bridged', 'mumbai', 'polygon', 'exchaintest', 'exchainmain'];
module.exports.id = "initTreasury3";