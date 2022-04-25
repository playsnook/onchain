require('dotenv').config();
const { delayBetweenDeployScripts } = require('../scripts/lib');

const BurialDelay = ethers.BigNumber.from(process.env.BURIAL_DELAY_IN_SECONDS);

module.exports = async ({getNamedAccounts, deployments}) => {
  const { deployer } = await getNamedAccounts();
  const SnookGame = await deployments.get('SnookGame');
  const SnookState = await deployments.get('SnookState');
  const SnookToken = await deployments.get('SnookToken');
  const SkillToken = await deployments.get('SkillToken');
  const Treasury = await deployments.get('Treasury');
  // const SkinRewards = await deployments.get('SkinRewards');
  const UniswapUSDCSkill = await deployments.get('UniswapUSDCSkill');
  // const SGE = await deployments.get('SGE');
  await deployments.execute(
    'Afterdeath',
    {from:deployer},
    'initialize',
    SnookState.address,
    SkillToken.address,
    SnookToken.address,
    // SkinRewards.address,
    UniswapUSDCSkill.address,
    Treasury.address,
    SnookGame.address,
    // SGE.address,
    BurialDelay
  );
  deployments.log('Afterdeath: initialize()');
  await delayBetweenDeployScripts();
  return true;
};
module.exports.tags = ['L2', 'L2bridged', 'mumbai', 'polygon', 'exchaintest'];
module.exports.id = 'initAfterdeath';
