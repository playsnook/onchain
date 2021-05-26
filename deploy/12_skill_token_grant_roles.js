module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployer} = await getNamedAccounts();
  const SnookGame = await deployments.get('SnookGame');

  const  BURNER_ROLE = await deployments.read(
    'SkillToken',
    {from:deployer},
    'BURNER_ROLE'
  );
  
  await deployments.execute(
    'SkillToken',
    {from: deployer},
    'grantRole',
    BURNER_ROLE,
    SnookGame.address  
  );

  deployments.log('SkillToken granted MINTER_ROLE to SnookGame');

};
module.exports.tags = ['SkillTokenGrantRoles'];