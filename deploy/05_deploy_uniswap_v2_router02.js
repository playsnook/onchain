const UniswapV2Router02Artifact = require('@uniswap/v2-periphery/build/UniswapV2Router02.json');

module.exports = async ({
  getNamedAccounts,
  deployments
}) => {
  const {deploy, log} = deployments;
  const {deployer} = await getNamedAccounts();
  const UniswapV2Factory = await deployments.get('UniswapV2Factory');
  const deployResult = await deploy('UniswapV2Router02', {
    contract: {
      abi: UniswapV2Router02Artifact.abi,
      bytecode: UniswapV2Router02Artifact.bytecode
    },
    from: deployer,
    gasLimit: 8000000,
    args: [
      UniswapV2Factory.address,
      deployer
    ],
  });  
  if (deployResult.newlyDeployed) {
    log(
      `contract UniswapV2Router02 deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed} gas`
    );
  }
};
module.exports.tags = ['UniswapV2Router02'];
