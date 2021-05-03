const ethers = require('ethers');
const SnookTokenArtifact = require('../../artifacts/contracts/SnookToken.sol/SnookToken.json');
const SnookTokenAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

const SnookGameArtifact = require('../../artifacts/contracts/SnookGame.sol/SnookGame.json');
const SnookGameAddress = '0x610178dA211FEF7D417bC0e6FeD39F05609AD788';

const UniswapUSDTSkillArtifact = require('../../artifacts/contracts/UniswapUSDCSkill.sol/UniswapUSDCSkill.json');
const UniswapUSDCSkillAddress = '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318';

const SkillTokenArtifact = require('../../artifacts/contracts/SkillToken.sol/SkillToken.json');
const SkillTokenAddress = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';

class SnookWebException extends Error {
  constructor(message) {
    super(message);
    this.name = 'SnookWebException';
  }
}

class SnookWeb {
  uniswap
  signer
  signerAddress 
  snookToken
  snookGame
  skillToken
  constructor() {
    if (window.ethereum === undefined) {
      throw new SnookWebException('NO METAMASK');
    }
  }
  async login() {
    await window.ethereum.enable()
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    
    this.signer = provider.getSigner();
    this.signerAddress = await this.signer.getAddress();
    console.log(`signerAddress: ${this.signerAddress}`);
    
    this.snookToken = new ethers.Contract(SnookTokenAddress, SnookTokenArtifact.abi, this.signer);
    this.snookGame = new ethers.Contract(SnookGameAddress, SnookGameArtifact.abi, this.signer);
    this.uniswap = new ethers.Contract(UniswapUSDCSkillAddress, UniswapUSDTSkillArtifact.abi, this.signer);
    this.skillToken = new ethers.Contract(SkillTokenAddress, SkillTokenArtifact.abi, this.signer);
    //const balance = await this.snook.balanceOf(this.signerAddress);
    //console.log(balance)
  }

  async formatSnookPrice(price) {
    return ethers.utils.formatEther(price);
  }

  async getSnookPrice() {
    try {
      const price = await this.uniswap.getSnookPriceInSkills();
      return price;
    } catch(err) {
      throw new SnookWebException(err.message);
    }
  }

  async buy(price) {
    try {
      await this.skillToken.approve(SnookGameAddress, price);
      await this.snookGame.requestMint();
    } catch(err) {
      throw new SnookWebException(err.message);
    }
  }
}


module.exports = SnookWeb
