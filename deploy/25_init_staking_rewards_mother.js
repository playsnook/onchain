require('dotenv').config();
const { delayBetweenDeployScripts } = require('../scripts/lib');

const SecondsInDay = ethers.BigNumber.from(process.env.SECONDS_IN_DAY);
const MinStakingPeriod = ethers.BigNumber.from(process.env.MIN_STAKING_PERIOD_IN_DAYS);
const MinNumberOfStakers = ethers.BigNumber.from(process.env.MIN_NUMBER_OF_STAKERS);
const InterestRatePerDayInCentipercents = ethers.BigNumber.from(process.env.INTEREST_RATE_PER_DAY_IN_CENTIPERCENTS);
const MinStakingValueCoef = ethers.BigNumber.from(process.env.MIN_STAKING_VALUE_COEF);
const BurningRate = ethers.BigNumber.from(process.env.BURNING_RATE_IN_PERCENTS);
const InitialSkillSupply = ethers.BigNumber.from(process.env.INITIAL_SKILL_SUPPLY_IN_ETHERS);

module.exports = async ({getNamedAccounts, deployments}) => {
  const { deployer, admin } = await getNamedAccounts();
  const SkillToken = await deployments.get('SkillToken');
  const Treasury = await deployments.get('Treasury');

  const decimals = await deployments.read(
    'SkillToken',
    {from: deployer},
    'decimals'
  );
  
  await deployments.execute(
    'StakingRewards',
    {from:deployer},
    'initialize',
    SkillToken.address,
    Treasury.address,
    MinStakingPeriod,
    MinNumberOfStakers,
    InterestRatePerDayInCentipercents,
    InitialSkillSupply.mul(ethers.BigNumber.from(10).pow(decimals)), // in WEI
    MinStakingValueCoef,
    BurningRate,
    SecondsInDay,
    admin
  );
  deployments.log('Initialized StakingRewards');
  await delayBetweenDeployScripts();
  return true;
};
module.exports.tags = ['L2', 'L2bridged', 'mumbai', 'polygon', 'exchaintest'];
module.exports.id = 'initStakingRewards';
