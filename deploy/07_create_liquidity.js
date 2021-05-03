const { ethers} = require('hardhat');
const moment = require('moment');

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployer} = await getNamedAccounts();
  const UsdcToken = await deployments.get('UsdcToken');
  const SkillToken = await deployments.get('SkillToken');
  const UniswapV2Router02 = await deployments.get('UniswapV2Router02');

  await deployments.execute(
    'UsdcToken',
    {from: deployer},
    'approve',
    UniswapV2Router02.address,
    ethers.utils.parseEther('250')
  )

  await deployments.execute(
    'SkillToken',
    {from: deployer},
    'approve',
    UniswapV2Router02.address,
    ethers.utils.parseEther('1000')
  )

  await deployments.execute(
    'UniswapV2Router02',
    {from: deployer},
    'addLiquidity',
    UsdcToken.address,
    SkillToken.address,
    ethers.utils.parseEther('250'),
    ethers.utils.parseEther('1000'),
    ethers.utils.parseEther('249'),
    ethers.utils.parseEther('999'),
    deployer,
    moment().add(10, 'minutes').unix()
  )
  deployments.log('Added liquidity');
};
module.exports.tags = ['CreateLiquidity'];