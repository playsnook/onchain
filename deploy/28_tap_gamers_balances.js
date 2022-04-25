// Tap balances of gamers for test
const { delayBetweenDeployScripts } = require('../scripts/lib');
const {ethers } = require('hardhat');

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployer, gamer1, gamer2} = await getNamedAccounts();
  await deployments.execute(
    'SkillToken',
    {from:deployer},
    'transfer',
    gamer1,
    ethers.utils.parseEther('5000')
  );
  await deployments.execute(
    'SkillToken',
    {from:deployer},
    'transfer',
    gamer2,
    ethers.utils.parseEther('5000')
  );
  
  deployments.log('Tapped gamers balances');
  await delayBetweenDeployScripts();
  return true;
};
module.exports.tags = ['L2', 'L2bridged'];
module.exports.dependencies = ['delay'];
module.exports.id = 'TopGamersBalances';