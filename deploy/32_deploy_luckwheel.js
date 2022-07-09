require('dotenv').config();

const { delayBetweenDeployScripts, getDeployGasPrice } = require('../scripts/lib');

module.exports = async ({getNamedAccounts, deployments, network}) => {
  const { deployer, admin } = await getNamedAccounts();
  const {deploy, catchUnknownSigner} = deployments;
  const gasPrice = getDeployGasPrice(network.name);

  await catchUnknownSigner(
    deploy('LuckWheel', {
      from: deployer,
      gasPrice,
      proxy: {
        owner: admin,
        proxyContract: 'OpenZeppelinTransparentProxy',
      },
      skipIfAlreadyDeployed: false,
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