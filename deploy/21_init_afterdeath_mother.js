require('dotenv').config();
const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');
const BurialDelay = ethers.BigNumber.from(process.env.BURIAL_DELAY_IN_SECONDS);

module.exports = async ({getNamedAccounts, deployments, network}) => {
  const { deployer } = await getNamedAccounts();
  const gasPrice = getDeployGasPrice(network.name)
  const SnookGame = await deployments.get('SnookGame');
  const SnookState = await deployments.get('SnookState');
  const SnookToken = await deployments.get('SnookToken');
  const SkillToken = await deployments.get('SkillToken');
  const Treasury = await deployments.get('Treasury');
  const UniswapUSDCSkill = await deployments.get('UniswapUSDCSkill');
  
  await deployments.execute(
    'Afterdeath',
    {
      from:deployer,
      gasPrice
    },
    'initialize',
    SnookState.address,
    SkillToken.address,
    SnookToken.address,
    UniswapUSDCSkill.address,
    Treasury.address,
    SnookGame.address,
    BurialDelay
  );
  deployments.log('Afterdeath: initialize()');
  await delayBetweenDeployScripts();
  return true;
};
module.exports.tags = [
  'L2', 
  'L2bridged', 
  'mumbai', 
  'polygon', 
  'exchaintest',
  'skaletest'
];
module.exports.id = 'initAfterdeath';
