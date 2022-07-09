const UniswapV2Router02Artifact = require('@uniswap/v2-periphery/build/UniswapV2Router02.json');
const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');
module.exports = async ({
  getNamedAccounts,
  deployments,
  network
}) => {
  const {deploy, log} = deployments;
  const {deployer} = await getNamedAccounts();
  const gasPrice = getDeployGasPrice(network.name);

  const UniswapV2Factory = await deployments.get('UniswapV2Factory');
  const deployResult = await deploy('UniswapV2Router02', {
    contract: {
      abi: UniswapV2Router02Artifact.abi,
      bytecode: UniswapV2Router02Artifact.bytecode
    },
    from: deployer,
    gasLimit: 8000000,
    gasPrice,
    args: [
      UniswapV2Factory.address,
      deployer
    ],
    log: true,
    skipIfAlreadyDeployed: true,
  });  
  if (deployResult.newlyDeployed) {
    log(
      `contract UniswapV2Router02 deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed} gas`
    );
  }
  await delayBetweenDeployScripts();
};
module.exports.tags = ['L2',  'L2bridged', 'mumbai', 'exchaintest', 'skaletest'];
