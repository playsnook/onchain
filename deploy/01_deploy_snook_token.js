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

  await catchUnknownSigner(
    deploy('SnookToken', {
      from: deployer,
      gasPrice,
      proxy: {
        owner: admin,
        proxyContract: 'OpenZeppelinTransparentProxy'
      },
      log: true,
    })  
  );
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
