module.exports = async ({
  getNamedAccounts,
  deployments,
  getChainId,
  getUnnamedAccounts,
}) => {
  const {deploy, log} = deployments;
  const {deployer} = await getNamedAccounts();
  const deployResult = await deploy('SkillToken', {
    from: deployer,
    gasLimit: 4000000,
    args: [],
  });
  if (deployResult.newlyDeployed) {
    log(
      `contract SkillToken deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed} gas`
    );
  }
};
module.exports.tags = ['SkillToken'];
