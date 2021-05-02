const UniswapV2FactoryArtifact = require('@uniswap/v2-core/build/UniswapV2Factory.json');

module.exports = async ({
  getNamedAccounts,
  deployments
}) => {
  const {deploy, log} = deployments;
  const {deployer} = await getNamedAccounts();
  const deployResult = await deploy('UniswapV2Factory', {
    contract: {
      abi: UniswapV2FactoryArtifact.abi,
      bytecode: UniswapV2FactoryArtifact.bytecode
    },
    from: deployer,
    gasLimit: 4000000,
    args: [deployer],
  });  
  if (deployResult.newlyDeployed) {
    log(
      `contract UniswapV2Factroy deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed} gas`
    );
  }
};
module.exports.tags = ['UniswapV2Factory'];
