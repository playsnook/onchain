// Tap balances of gamers for test

const {ethers } = require('hardhat');

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployer, gamer1, gamer2} = await getNamedAccounts();
  
  await deployments.execute(
    'SkillToken',
    {from:deployer},
    'transfer',
    gamer1,
    ethers.utils.parseEther('100')
  );
  await deployments.execute(
    'SkillToken',
    {from:deployer},
    'transfer',
    gamer2,
    ethers.utils.parseEther('100')
  );
  
  deployments.log('Tapped balances');

};
module.exports.tags = ['TapBalances'];