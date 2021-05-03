module.exports = async ({
  getNamedAccounts,
  deployments,
}) => {
  const {deploy, log} = deployments;
  const {deployer} = await getNamedAccounts();
  const deployResult = await deploy('SnookToken', {
    from: deployer,
    gasLimit: 4000000,
    args: [],
  });  
  if (deployResult.newlyDeployed) {
    log(
      `contract SnookToken deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed} gas`
    );
  }
};
module.exports.tags = ['SnookToken'];
