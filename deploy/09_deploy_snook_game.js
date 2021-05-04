module.exports = async ({
  getNamedAccounts,
  deployments
}) => {
  const {deploy, log, get} = deployments;
  const {deployer} = await getNamedAccounts();
  const SnookToken = await get('SnookToken');
  const SkillToken = await get('SkillToken');
  const UniswapUSDCSkill = await get('UniswapUSDCSkill');
  
  const deployResult = await deploy('SnookGame', {
    from: deployer,
    gasLimit: 5000000,
    args: [
      SnookToken.address,
      SkillToken.address,
      UniswapUSDCSkill.address
    ],
  });  
  if (deployResult.newlyDeployed) {
    log(
      `contract SnookGame deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed} gas`
    );
  }

};
module.exports.tags = ['SnookGame'];
