require('dotenv').config();
const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');
module.exports = async ({
  getNamedAccounts,
  deployments,
  network
}) => {
  const {deploy, catchUnknownSigner} = deployments;
  const {deployer, admin} = await getNamedAccounts();
  const gasPrice = getDeployGasPrice(network.name);

  // Making deployer to be Snook Foundatiion
  await catchUnknownSigner( 
    deploy('SnookState', {
      from: deployer,
      gasLimit: 4_000_000,
      gasPrice,
      proxy: {
        owner: admin,
        proxyContract: 'OpenZeppelinTransparentProxy',
      },
      args: [],
      log: true
    })
  )
  await delayBetweenDeployScripts();
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