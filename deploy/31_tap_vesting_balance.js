const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');
module.exports = async ({getNamedAccounts, deployments, network}) => {
  const { deployer } = await getNamedAccounts();
  const gasPrice = getDeployGasPrice(network.name);
  const Vesting = await deployments.get('Vesting');

  const balanceOfDeployer = await deployments.read(
    'SkillToken',
    {from:deployer},
    'balanceOf',
    deployer
  );

  await deployments.execute(
    'SkillToken',
    {from:deployer, gasPrice},
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
module.exports.tags = [
  'L2', 
  'L2bridged', 
  'mumbai', 
  'polygon', 
  'exchaintest', 
  'skaletest'
];
module.exports.id = 'TopVestingBalance';