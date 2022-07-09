const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');

const gasPrice = getDeployGasPrice(network.name);

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployer} = await getNamedAccounts();
  const UsdcToken = await deployments.get('UsdcToken');
  const SkillToken = await deployments.get('SkillToken');
  

  await deployments.execute(
    'UniswapV2Factory', 
    {
      from: deployer,
      gasPrice
    }, 
    'createPair', 
    UsdcToken.address, 
    SkillToken.address
  );
  deployments.log('Created UsdcToken-SkillToken pair');

  await delayBetweenDeployScripts();

  return true;
};

module.exports.tags = ['L2', 'L2bridged', 'mumbai', 'exchaintest','skaletest'];
module.exports.id = 'createUniswapPair';
