const { ethers } = require('hardhat');
const { delayBetweenDeployScripts } = require('../scripts/lib');
const PublicSaleInitialBalanceInWei = ethers.utils
  .parseEther(process.env.PUBLIC_SALE_INITIAL_BALANCE_IN_ETHERS);

const PublicSaleAddress = process.env.PUBLIC_SALE_ADDRESS;
module.exports = async ({getNamedAccounts, deployments}) => {
  const { deployer } = await getNamedAccounts();
  deployments.log(`PublicSaleInitialBalanceInWei: ${PublicSaleInitialBalanceInWei}`);

  const balanceOfDeployer1 = await deployments.read(
    'SkillToken',
    {from:deployer},
    'balanceOf',
    deployer
  );

  await deployments.execute(
    'SkillToken',
    {from:deployer},
    'transfer',
    PublicSaleAddress,
    PublicSaleInitialBalanceInWei
  );
  
  const balanceOfPublicSale = await deployments.read(
    'SkillToken',
    {from:deployer},
    'balanceOf',
    PublicSaleAddress
  );

  const balanceOfDeployer2 = await deployments.read(
    'SkillToken',
    {from:deployer},
    'balanceOf',
    deployer
  );

  deployments.log(`
    Tapped public sale balance to ${balanceOfPublicSale} 
    deployer balance before: ${balanceOfDeployer1}
    deployer balance after: ${balanceOfDeployer2}
  `);
  await delayBetweenDeployScripts();
  return true;
  
};
module.exports.tags = ['L2', 'L2bridged', 'mumbai', 'polygon', 'exchaintest'];
module.exports.id = 'TopPublicSaleBalance';