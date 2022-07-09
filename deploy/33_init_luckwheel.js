const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');
const SecondsInDay = process.env.SECONDS_IN_DAY;
const ChanceToWin200SNK1in = process.env.CHANCE_TO_WIN_200SNK_1_IN;
const ChanceToWin500SNK1in = process.env.CHANCE_TO_WIN_500SNK_1_IN;
const ChanceToMintSNOOK1in = process.env.CHANCE_TO_MINT_SNOOK_1_IN;
const RequiredCheckinsToSilverWheel = process.env.REQUIRED_CHECKINS_TO_SILVER_WHEEL;
const RequiredCheckinsToGoldenWheel = process.env.REQUIRED_CHECKINS_TO_GOLDEN_WHEEL;
module.exports = async ({getNamedAccounts, deployments, network}) => {
  const { deployer } = await getNamedAccounts();
  const gasPrice = getDeployGasPrice(network.name);
  const PRNG = await deployments.get('PRNG');
  const Treasury = await deployments.get('Treasury');
  await deployments.execute(
    'LuckWheel',
    {from:deployer, gasPrice},
    'initialize',
    SecondsInDay,
    PRNG.address,
    Treasury.address,
    ChanceToWin200SNK1in,
    ChanceToWin500SNK1in,
    ChanceToMintSNOOK1in,
    RequiredCheckinsToSilverWheel,
    RequiredCheckinsToGoldenWheel
  );
  deployments.log('Initialized LuckWheel');
  await delayBetweenDeployScripts();
  return true;
};
module.exports.tags = [
  'L2', 
  'L2bridged', 
  'mumbai', 
  'polygon', 
  'exchaintest', 
  'exchainmain',
  'skaletest'
];
module.exports.id = 'initLuckWheel';
