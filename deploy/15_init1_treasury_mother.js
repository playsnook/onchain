require('dotenv').config();
const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');
const TreasuryShares = [
  ethers.BigNumber.from(process.env.TREASURY_FOUNDERS_SHARE_IN_CENTIPERCENTS),
  ethers.BigNumber.from(process.env.TREASURY_STAKING_SHARE_IN_CENTIPERCENTS),
  ethers.BigNumber.from(process.env.TREASURY_SKIN_SHARE_IN_CENTIPERCENTS)
];
const TreasuryCycles = [
  ethers.BigNumber.from(process.env.TREASURY_FOUNDERS_CYCLE_IN_DAYS),
  ethers.BigNumber.from(process.env.TREASURY_STAKING_CYCLE_IN_DAYS),
  ethers.BigNumber.from(process.env.TREASURY_SKIN_CYCLE_IN_DAYS)
];
const SecondsInDay = ethers.BigNumber.from(process.env.SECONDS_IN_DAY);
const FoundersAddress = process.env.FOUNDERS_ADDRESS;

module.exports = async ({getNamedAccounts, deployments, network}) => {
  const { deployer } = await getNamedAccounts();
  const gasPrice = getDeployGasPrice(network.name);

  const SkillToken = await deployments.get('SkillToken');
  
  const TreasuryPayees = [
    FoundersAddress,
    deployer, // unused by contract anymore
    deployer // unused by contract anymore
  ];
  
  await deployments.execute(
    'Treasury',
    {
      from:deployer,
      gasLimit: 4_000_000,
      gasPrice,
    },
    'initialize',
    SkillToken.address,
    TreasuryPayees,
    TreasuryShares,
    TreasuryCycles,
    SecondsInDay
  );
  deployments.log('Initialized Treasury');
  await delayBetweenDeployScripts();
  return true;
};
module.exports.tags = ['L2', 'L2bridged', 'mumbai', 'polygon', 'exchaintest', 'skaletest'];
module.exports.id = "initTreasury";