require('dotenv').config();
const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');
const addresses = require('../addresses.json');
const SkillTokenName = process.env.SKILL_TOKEN_NAME;
const SkillTokenSymbol = process.env.SKILL_TOKEN_SYMBOL;
module.exports = async ({
  getNamedAccounts,
  deployments,
  network
}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();
  const gasPrice = getDeployGasPrice(network.name);
  await deploy('SkillToken', {
    from: deployer,
    gasLimit: 4_000_000,
    gasPrice,
    args: [
      SkillTokenName,
      SkillTokenSymbol,
      process.env.INITIAL_SKILL_SUPPLY_IN_ETHERS,
      18,
      addresses[network.name].ChildChainManagerProxy
    ],
    log: true,
    skipIfAlreadyDeployed: true
  });
  await delayBetweenDeployScripts();
};
module.exports.tags = ['L2', 'L2bridged', 'mumbai', 'polygon', 'exchaintest'];