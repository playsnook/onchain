const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');
const UniswapV2FactoryArtifact = require('@uniswap/v2-core/build/UniswapV2Factory.json');

module.exports = async ({
  getNamedAccounts,
  deployments,
  network
}) => {
  const {deploy, log} = deployments;
  const {deployer} = await getNamedAccounts();
  const gasPrice = getDeployGasPrice(network.name);

  const deployResult = await deploy('UniswapV2Factory', {
    contract: {
      abi: UniswapV2FactoryArtifact.abi,
      bytecode: UniswapV2FactoryArtifact.bytecode
    },
    from: deployer,
    gasLimit: 4000000,
    gasPrice,
    args: [deployer],
    log: true,
    skipIfAlreadyDeployed: true,
  });  
  if (deployResult.newlyDeployed) {
    log(
      `contract UniswapV2Factroy deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed} gas`
    );
  }
  await delayBetweenDeployScripts();
};
module.exports.tags = ['L2', 'L2bridged', 'mumbai', 'exchaintest'];
