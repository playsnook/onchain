const { delayBetweenDeployScripts } = require('../scripts/lib');

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployer} = await getNamedAccounts();
  const UsdcToken = await deployments.get('UsdcToken');
  const SkillToken = await deployments.get('SkillToken');
  

  await deployments.execute(
    'UniswapV2Factory', 
    {from: deployer}, 
    'createPair', 
    UsdcToken.address, 
    SkillToken.address
  );
  deployments.log('Created UsdcToken-SkillToken pair');

  await delayBetweenDeployScripts();

  return true;
};

module.exports.tags = ['L2', 'L2bridged', 'mumbai', 'exchaintest'];
module.exports.id = 'createUniswapPair';
