require('dotenv').config();
const { delayBetweenDeployScripts } = require('../scripts/lib');

const BurialDelay = ethers.BigNumber.from(process.env.BURIAL_DELAY_IN_SECONDS);
const addresses = require('../addresses.json');

module.exports = async ({getNamedAccounts, deployments, network}) => {
  const { deployer } = await getNamedAccounts();
  const SnookGame = await deployments.get('SnookGame');
  const SnookState = await deployments.get('SnookState');
  const SnookToken = await deployments.get('SnookToken');
  const SkillTokenAddress = addresses[network.name].Anyswap.ContractAddress;
  const Treasury = await deployments.get('Treasury');
  const UniswapUSDCSkill = await deployments.get('UniswapUSDCSkill');
  
  await deployments.execute(
    'Afterdeath',
    {from:deployer},
    'initialize',
    SnookState.address,
    SkillTokenAddress,
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
module.exports.tags = ['exchainmain'];
module.exports.id = 'initAfterdeathBridged';
