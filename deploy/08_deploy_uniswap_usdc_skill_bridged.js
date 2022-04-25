require('dotenv').config();

const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');
const addresses = require('../addresses.json');

module.exports = async ({
  getNamedAccounts,
  deployments,
  network
}) => {
  const {deploy, log} = deployments;
  const {deployer} = await getNamedAccounts();
  const gasPrice = getDeployGasPrice(network.name);

  const SkillTokenAddress = addresses[network.name].Anyswap.ContractAddress;
  const UsdcTokenAddress = addresses[network.name].USDCTokenAddress;
  const UniswapV2FactoryAddress = addresses[network.name].UniswapV2FactoryAddress;

  const deployResult = await deploy('UniswapUSDCSkill', {
    from: deployer,
    gasLimit: 4_000_000,
    gasPrice,
    args: [
      UniswapV2FactoryAddress,
      UsdcTokenAddress,
      SkillTokenAddress
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
module.exports.tags = ['exchainmain'];
