const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');
const { Ecosystem: [EcosytemAddress ]} = require('../.vesting.json');
const FOUNDERS_ADDRESS = process.env.FOUNDERS_ADDRESS;

const BBT_WINNING_FEE_IN_PERCENTS = process.env.BBT_WINNING_FEE_IN_PERCENTS; 
const BBT_ROOM_CREATION_PRICE_IN_USDC = process.env.BBT_ROOM_CREATION_PRICE_IN_USDC; 
const BBT_STAKING_WINDOW_IN_SECONDS = process.env.BBT_STAKING_WINDOW_IN_SECONDS;
const BBT_ACTIVE_ROOM_DELETION_DELAY_IN_SECONDS = process.env.BBT_ACTIVE_ROOM_DELETION_DELAY_IN_SECONDS
const BBT_NATIVE2USDC_NUMERATOR_IN_ETHER_UNITS = process.env.BBT_NATIVE2USDC_NUMERATOR_IN_ETHER_UNITS;
const BBT_NATIVE2USDC_DENOMINATOR_IN_ETHER_UNITS = process.env.BBT_NATIVE2USDC_DENOMINATOR_IN_ETHER_UNITS;
const BBT_MINIMAL_STAKE_IN_USDC = process.env.BBT_MINIMAL_STAKE_IN_USDC;
const BBT_LOCKING_WINDOW_IN_SECONDS = process.env.BBT_LOCKING_WINDOW_IN_SECONDS;

module.exports = async ({getNamedAccounts, deployments, network}) => {
  const { deployer, admin } = await getNamedAccounts();
  const gasPrice = getDeployGasPrice(network.name);
  const SkillToken = await deployments.get('SkillToken');
  const UniswapUSDCSkill = await deployments.get('UniswapUSDCSkill');
  const CollectionList = await deployments.get('CollectionList');
  const args = [
    admin,
    BBT_WINNING_FEE_IN_PERCENTS,
    BBT_ROOM_CREATION_PRICE_IN_USDC,
    BBT_LOCKING_WINDOW_IN_SECONDS,
    BBT_STAKING_WINDOW_IN_SECONDS,
    BBT_ACTIVE_ROOM_DELETION_DELAY_IN_SECONDS,
    BBT_MINIMAL_STAKE_IN_USDC,
    BBT_NATIVE2USDC_NUMERATOR_IN_ETHER_UNITS,
    BBT_NATIVE2USDC_DENOMINATOR_IN_ETHER_UNITS,
    FOUNDERS_ADDRESS,
    SkillToken.address,
    EcosytemAddress,
    UniswapUSDCSkill.address,
    CollectionList.address
  ];
  await deployments.execute(
    'BigBoyTable',
    {from:deployer, gasPrice},
    'initialize',
    args
  );
  deployments.log('Initialized BigBoyTable');
  await delayBetweenDeployScripts();
  return true;
};
module.exports.tags = ['L2', 'mumbai', 'polygon', 'skaletest'];
module.exports.id = 'initBigBoyTable';
