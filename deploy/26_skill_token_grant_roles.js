const { delayBetweenDeployScripts } = require('../scripts/lib');

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployer} = await getNamedAccounts();
  const SkillToken = await deployments.get('SkillToken');
  const SnookGame = await deployments.get('SnookGame');
  const StakingRewards = await deployments.get('StakingRewards');
  const  BURNER_ROLE = await deployments.read(
    'SkillToken',
    {from:deployer},
    'BURNER_ROLE'
  );

  const  DEFAULT_ADMIN_ROLE = await deployments.read(
    'SkillToken',
    {from:deployer},
    'DEFAULT_ADMIN_ROLE'
  );
  
  await deployments.execute(
    'SkillToken',
    {from: deployer},
    'grantRole',
    BURNER_ROLE,
    SnookGame.address  
  );

  await deployments.execute(
    'SkillToken',
    {from: deployer},
    'grantRole',
    BURNER_ROLE,
    StakingRewards.address  
  );

  await deployments.execute(
    'SkillToken',
    {from: deployer},
    'revokeRole',
    DEFAULT_ADMIN_ROLE,
    deployer 
  );

  deployments.log('SkillToken granted BURNER_ROLE to SnookGame and StakingRewards');
  await delayBetweenDeployScripts();
  return true;
};
module.exports.tags = ['L2', 'L2bridged', 'mumbai', 'polygon', 'exchaintest'];
module.exports.id = 'SkillGrantsRoles'
