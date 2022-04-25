require('dotenv').config();
const { delayBetweenDeployScripts } = require('../scripts/lib');
const addresses = require('../addresses.json');

module.exports = async ({getNamedAccounts, deployments, network}) => {
  const { deployer, admin } = await getNamedAccounts();
  const UniswapUSDCSkill = await deployments.get('UniswapUSDCSkill');
  const SnookState = await deployments.get('SnookState');
  const SnookToken = await deployments.get('SnookToken');
  
  const SkillTokenAddress = addresses[network.name].Anyswap.ContractAddress;
  const Afterdeath = await deployments.get('Afterdeath');
  deployments.log(`Initing SnookGame: deployer: ${deployer} admin: ${admin}`);
  await deployments.execute(
    'SnookGame',
    {from:deployer},
    'initialize',
    SnookState.address,
    SnookToken.address,
    SkillTokenAddress,
    UniswapUSDCSkill.address,
    Afterdeath.address,
    admin
  );
  deployments.log('SnookGame: initialize()');
  await delayBetweenDeployScripts();
  return true;
};
module.exports.tags = ['exchainmain'];
module.exports.id = 'initSnookGameBridged';
