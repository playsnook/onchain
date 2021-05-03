module.exports = async ({
  getNamedAccounts,
  deployments
}) => {
  const {deploy, log, get} = deployments;
  const {deployer} = await getNamedAccounts();
  const SkillToken = await get('SkillToken');
  const UniswapUSDCSkill = await get('UniswapUSDCSkill');
  
  const deployResult = await deploy('SnookToken', {
    from: deployer,
    gasLimit: 4000000,
    args: [
      SkillToken.address,
      UniswapUSDCSkill.address
    ],
  });  
  if (deployResult.newlyDeployed) {
    log(
      `contract SnookToken deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed} gas`
    );
  }

};
module.exports.tags = ['UsdcToken'];
