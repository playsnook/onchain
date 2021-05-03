module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployer} = await getNamedAccounts();
  const SnookGame = await deployments.get('SnookGame');

  const  MINTER_ROLE = await deployments.read(
    'SnookToken',
    {from:deployer},
    'MINTER_ROLE'
  );
  
  await deployments.execute(
    'SnookToken',
    {from: deployer},
    'grantRole',
    MINTER_ROLE,
    SnookGame.address  
  );

  deployments.log('SnookToken granted MINTER_ROLE to SnookGame');
  
};
module.exports.tags = ['SnookTokenGrantRoles'];