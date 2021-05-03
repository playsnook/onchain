module.exports = async ({
  getNamedAccounts,
  deployments,
  getChainId,
  getUnnamedAccounts,
}) => {
  const {deploy, log} = deployments;
  const {deployer} = await getNamedAccounts();
  const deployResult = await deploy('UsdcToken', {
    from: deployer,
    gasLimit: 4000000,
    args: [],
  });  
  if (deployResult.newlyDeployed) {
    log(
      `contract UsdcToken deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed} gas`
    );
  }
};
module.exports.tags = ['UsdcToken'];
