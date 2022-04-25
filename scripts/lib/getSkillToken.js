const { ethers, network } = require('hardhat');
const addresses = require('../../addresses.json');
const AnyswapV5ERC20Abi = require('../externalAbis/AnyswapV5ERC20.json');
async function getSkillToken(signer) {
  let SkillToken;
  try {
    SkillToken = await ethers.getContract('SkillToken', signer);
  } catch(err) {
    const AnyswapAddress = addresses[network.name].Anyswap.ContractAddress
    console.log(`Could not get SkillToken deployment, falling for Anyswap contract at ${AnyswapAddress} for network ${network.name}`);
    SkillToken = await ethers.getContractAt(
      AnyswapV5ERC20Abi,
      AnyswapAddress,
      signer
    );
  }
  return SkillToken;
}

module.exports = getSkillToken;