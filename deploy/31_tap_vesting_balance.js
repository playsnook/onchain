const { ethers } = require('hardhat');
const { delayBetweenDeployScripts } = require('../scripts/lib');
module.exports = async ({getNamedAccounts, deployments}) => {
  const { deployer } = await getNamedAccounts();
  const Vesting = await deployments.get('Vesting');

  const balanceOfDeployer = await deployments.read(
    'SkillToken',
    {from:deployer},
    'balanceOf',
    deployer
  );

  await deployments.execute(
    'SkillToken',
    {from:deployer},
    'transfer',
    Vesting.address,
    balanceOfDeployer
  );

  const balanceOfVesting = await deployments.read(
    'SkillToken',
    {from:deployer},
    'balanceOf',
    Vesting.address
  );

  deployments.log(`Tapped vesting balance to ${balanceOfVesting}`);
  await delayBetweenDeployScripts();
  return true;
};
module.exports.tags = ['L2', 'L2bridged', 'mumbai', 'polygon', 'exchaintest'];
module.exports.id = 'TopVestingBalance';