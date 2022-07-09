require('dotenv').config();

const assert = require('assert');
const { Ecosystem, LiquidityPool } = require('../.vesting.json');
const { Vesting } = require('../scripts/lib');
const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');
const SecondsInDay = ethers.BigNumber.from(process.env.SECONDS_IN_DAY);
const { utils: {parseEther: PE, parseUnits: PU}} = ethers;

const InitialVestingBalance = ethers.utils.parseEther(process.env.INITIAL_VESTING_BALANCE_IN_ETHER);
let VestingStartTimestamp = ethers.BigNumber.from(process.env.VESTING_START_TIMESTAMP);
if (VestingStartTimestamp.eq(0)) { // for tests
  VestingStartTimestamp = ethers.BigNumber.from(Math.ceil(Date.now()/1000));
}

const CurrentVestingBalance = ethers.BigNumber.from(process.env.CURRENT_VESTING_BALANCE_IN_WEI);
const SentToTreasury = ethers.BigNumber.from(process.env.SENT_TO_TREASURY_IN_WEI);
const SentToEcosystem = ethers.BigNumber.from(process.env.SENT_TO_ECOSYSTEM_IN_WEI);
const SentToLiquidity = ethers.utils.parseEther(process.env.SENT_TO_LIQUIDITY_IN_ETHER);

module.exports = async ({getNamedAccounts, deployments, network}) => {
  const TreasuryDeployment = await deployments.get('Treasury');
  const SkillTokenDeployment = await deployments.get('SkillToken');
  const { deployer } = await getNamedAccounts();
  const gasPrice = getDeployGasPrice(network.name);
  const vesting = new Vesting(TreasuryDeployment.address);
  await vesting.init();
  
  if (CurrentVestingBalance.gt(ethers.BigNumber.from(0))) {
    assert(InitialVestingBalance.eq(
        CurrentVestingBalance
          .add(SentToLiquidity)
          .add(SentToTreasury)
          .add(SentToEcosystem)
      )
    );
  }

  const benefsAlreadyReleased = [
    LiquidityPool[0],
    Ecosystem[0],
    TreasuryDeployment.address
  ];
  const amountsAlreadyReleased = [
    SentToLiquidity,
    SentToEcosystem,
    SentToTreasury
  ];
  
  deployments.log(`Vesting contracts will use ${VestingStartTimestamp} timestamp`);

  await deployments.deploy('Vesting', {
    from: deployer,
    gasLimit: 10_000_000,
    gasPrice,
    args: [
      SkillTokenDeployment.address,
      vesting.getBeneficiaries(),
      vesting.getAwards(),
      SecondsInDay,
      InitialVestingBalance,

      VestingStartTimestamp,
      benefsAlreadyReleased,
      amountsAlreadyReleased
    ],
    skipIfAlreadyDeployed: true,
    log: true,
  });

  deployments.log(`Vesting contract deployed with total rewards:${InitialVestingBalance}`);
  
  await delayBetweenDeployScripts();
};
module.exports.tags = [
  'L2', 
  'L2bridged', 
  'mumbai', 
  'polygon', 
  'exchaintest', 
  'skaletest'
];
