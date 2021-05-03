module.exports = async ({
  getNamedAccounts,
  deployments
}) => {
  const {deploy, log, get} = deployments;
  const {deployer} = await getNamedAccounts();
  const UsdcToken = await get('UsdcToken');
  const SkillToken = await get('SkillToken');
  const UniswapV2Factory = await get('UniswapV2Factory');

  const deployResult = await deploy('UniswapUSDCSkill', {
    from: deployer,
    gasLimit: 4000000,
    args: [
      UniswapV2Factory.address,
      UsdcToken.address,
      SkillToken.address
    ],
  });  
  if (deployResult.newlyDeployed) {
    log(
      `contract UniswapUSDCSkill deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed} gas`
    );
  }

};
module.exports.tags = ['UsdcToken'];
