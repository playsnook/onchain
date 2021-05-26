module.exports = async ({
  getNamedAccounts,
  deployments,
}) => {
  const {deploy, log, get} = deployments;
  const {deployer} = await getNamedAccounts();
  const SkillToken = await get('SkillToken');
  // Making deployer to be Snook Foundatiion
  const deployResult = await deploy('Treasury', {
    from: deployer,
    args: [ SkillToken.address ]
  });
  if (deployResult.newlyDeployed) {
    log(
      `contract Treasury deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed} gas`
    );
  }
};
module.exports.tags = ['SkillToken'];
