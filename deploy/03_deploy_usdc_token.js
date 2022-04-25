const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');
module.exports = async ({
  getNamedAccounts,
  deployments,
  network
}) => {
  const {deploy, log} = deployments;
  const {deployer} = await getNamedAccounts();
  const gasPrice = getDeployGasPrice(network.name);

  const deployResult = await deploy('UsdcToken', {
    from: deployer,
    gasLimit: 4_000_000,
    gasPrice,
    args: [],
  });  
  if (deployResult.newlyDeployed) {
    log(
      `contract UsdcToken deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed} gas`
    );
  }
  await delayBetweenDeployScripts();
};
module.exports.tags = ['L2', 'L2bridged', 'mumbai', 'exchaintest'];