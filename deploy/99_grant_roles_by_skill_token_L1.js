const addresses = require('../addresses.json');

module.exports = async ({
  getNamedAccounts, 
  deployments,
  network
}) => {
  const {deployer} = await getNamedAccounts();
  
  const  PREDICATE_ROLE = await deployments.read(
    'SkillTokenL1',
    {from:deployer},
    'PREDICATE_ROLE'
  );
  
  await deployments.execute(
    'SkillTokenL1',
    {
      from: deployer,
      gasLimit: 4_000_000,
    },
    'grantRole',
    PREDICATE_ROLE,
    addresses[network.name].MintableERC20PredicateProxy  
  );
  deployments.log('Granted role', PREDICATE_ROLE);
};
module.exports.tags = ['L1'];
module.exports.dependencies = ['SkillTokenL1']
module.exports.id = 'GrantRole'