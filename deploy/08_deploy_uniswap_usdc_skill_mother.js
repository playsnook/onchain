require('dotenv').config();

const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');
module.exports = async ({
  getNamedAccounts,
  deployments,
  network
}) => {
  const {deploy, log, get, getOrNull} = deployments;
  const {deployer} = await getNamedAccounts();
  const SkillToken = await get('SkillToken');
  const UsdcToken = await getOrNull('UsdcToken');
  const UniswapV2Factory = await getOrNull('UniswapV2Factory');
  const gasPrice = getDeployGasPrice(network.name);

  let UsdcTokenAddress;
  let UniswapV2FactoryAddress;
  if (UsdcToken == null) {
    UsdcTokenAddress = process.env.USDC_TOKEN_ADDRESS;
  } else {
    UsdcTokenAddress = UsdcToken.address;
  }
  
  if (UniswapV2Factory == null) {
    UniswapV2FactoryAddress = process.env.UNISWAP_V2_FACTORY_ADDRESS;
  } else {
    UniswapV2FactoryAddress = UniswapV2Factory.address;
  }

  const deployResult = await deploy('UniswapUSDCSkill', {
    from: deployer,
    gasLimit: 4_000_000,
    gasPrice,
    args: [
      UniswapV2FactoryAddress,
      UsdcTokenAddress,
      SkillToken.address
    ],
    log: true,
  });  
  if (deployResult.newlyDeployed) {
    log(
      `contract UniswapUSDCSkill deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed} gas`
    );
  }
  await delayBetweenDeployScripts();
};
module.exports.tags = ['L2', 'L2bridged', 'mumbai', 'polygon', 'exchaintest', 'skaletest'];
