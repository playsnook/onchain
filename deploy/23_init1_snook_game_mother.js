require('dotenv').config();
const { delayBetweenDeployScripts } = require('../scripts/lib');

module.exports = async ({getNamedAccounts, deployments}) => {
  const { deployer, admin } = await getNamedAccounts();
  const UniswapUSDCSkill = await deployments.get('UniswapUSDCSkill');
  const SnookState = await deployments.get('SnookState');
  const SnookToken = await deployments.get('SnookToken');
  const SkillToken = await deployments.get('SkillToken');
  const Afterdeath = await deployments.get('Afterdeath');
  deployments.log(`Initing SnookGame: deployer: ${deployer} admin: ${admin}`);
  await deployments.execute(
    'SnookGame',
    {from:deployer},
    'initialize',
    SnookState.address,
    SnookToken.address,
    SkillToken.address,
    UniswapUSDCSkill.address,
    Afterdeath.address,
    admin
  );
  deployments.log('SnookGame: initialize()');
  await delayBetweenDeployScripts();
  return true;
};
module.exports.tags = ['L2', 'L2bridged', 'mumbai', 'polygon', 'exchaintest'];
module.exports.id = 'initSnookGame';
