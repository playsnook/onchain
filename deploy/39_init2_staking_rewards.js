const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');
const logMessage = "StakingRewards: initialize2";
const {Ecosystem: [EcosystemAddress]} = require('../.vesting.json');
module.exports = async ({getNamedAccounts, deployments, network}) => {
  const { deployer } = await getNamedAccounts();
  const gasPrice = getDeployGasPrice(network.name);

  await deployments.execute(
    'StakingRewards',
    {
      from:deployer,
      gasPrice
    },
    'initialize2',
    EcosystemAddress
  );
  deployments.log(logMessage);
  await delayBetweenDeployScripts();
  return true;
};
module.exports.tags = ['L2', 'mumbai', 'polygon','skaletest'];
module.exports.id = 'init2StakingRewards';
