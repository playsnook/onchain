const hre = require('hardhat');
const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');
const logMessage = "BurnSafe: initialize";
const addresses = require('../addresses.json');

module.exports = async ({getNamedAccounts, deployments, network}) => {
  const { deployer } = await getNamedAccounts();
  const gasPrice = getDeployGasPrice(network.name);


  let StakingRewards; // contract with BURNER role
  let AnyswapV5ERC20Address;
  let MaximumSwapAmount = 0;
  let MinimumSwapAmount = 0;
  let MaximumSwapFeeAmount = 0;
  let MinimumSwapFeeAmount = 0;
  const {Anyswap} = addresses[network.name];
  if (Anyswap === undefined) { // bridged testnetwork
    //  For bridged test network without Anyswap bridge, 
    //  use SkillToken and StakingRewards deployments on that test network
    const SkillToken = await deployments.get('SkillToken');
    AnyswapV5ERC20Address = SkillToken.address;
    StakingRewards = await deployments.get('StakingRewards');
  }
  else {
    AnyswapV5ERC20Address = Anyswap.ContractAddress; // bridged mainnetwork
    MaximumSwapAmount = Anyswap.MaximumSwapAmount;
    MinimumSwapAmount = Anyswap.MinimumSwapAmount;
    MaximumSwapFeeAmount = Anyswap.MaximumSwapFeeAmount;
    MinimumSwapFeeAmount = Anyswap.MinimumSwapFeeAmount;
    StakingRewards = await hre.companionNetworks['polygon'].deployments.get('StakingRewards');
  }

  await deployments.execute(
    'BurnSafe',
    {
      from:deployer,
      gasPrice
    },
    "initialize",
    AnyswapV5ERC20Address,
    StakingRewards.address,
    MaximumSwapAmount,
    MinimumSwapAmount,
    MaximumSwapFeeAmount,
    MinimumSwapFeeAmount
  );
  deployments.log(logMessage);
  await delayBetweenDeployScripts();
  return true;
};
module.exports.tags = ['L2bridged', 'exchaintest', 'exchainmain'];
module.exports.id = 'initBurnSafe';
