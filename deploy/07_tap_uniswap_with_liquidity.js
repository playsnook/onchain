const { ethers} = require('hardhat');
const moment = require('moment');
const { delayBetweenDeployScripts } = require('../scripts/lib');

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployer} = await getNamedAccounts();
  const UsdcToken = await deployments.get('UsdcToken');
  const SkillToken = await deployments.get('SkillToken');
  const UniswapV2Router02 = await deployments.get('UniswapV2Router02');

  const UsdcTokenDecimals = await deployments.read(
    'UsdcToken',
    {from:deployer},
    'decimals',
  );

  deployments.log(`UsdcToken decimals: ${UsdcTokenDecimals}`);

  const SkillTokenDecimals = await deployments.read(
    'SkillToken',
    {from:deployer},
    'decimals',
  );

  deployments.log(`SkillToken decimals: ${SkillTokenDecimals}`);

  await deployments.execute(
    'UsdcToken',
    {from: deployer},
    'approve',
    UniswapV2Router02.address,
    ethers.utils.parseUnits('250', UsdcTokenDecimals)
  )

  await deployments.execute(
    'SkillToken',
    {from: deployer},
    'approve',
    UniswapV2Router02.address,
    ethers.utils.parseUnits('1000', SkillTokenDecimals)
  )

  await deployments.execute(
    'UniswapV2Router02',
    {from: deployer},
    'addLiquidity',
    UsdcToken.address,
    SkillToken.address,
    ethers.utils.parseUnits('250', UsdcTokenDecimals),
    ethers.utils.parseUnits('1000', SkillTokenDecimals),
    ethers.utils.parseUnits('249', UsdcTokenDecimals),
    ethers.utils.parseUnits('999', SkillTokenDecimals),
    deployer,
    moment().add(10, 'minutes').unix()
  )
  deployments.log('Added liquidity');
  await delayBetweenDeployScripts();
  return true;
};
module.exports.tags = ['L2', 'L2bridged'];
module.exports.id = 'createLiquidity';
