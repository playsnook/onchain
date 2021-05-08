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
  _signerAddress
  snookToken
  snookGame
  skillToken
  _eventHandlers
  constructor() {
    if (window.ethereum === undefined) {
      throw new SnookWebException('NO METAMASK');
    }

    this._eventHandlers = [];

  }
  
  on(eventName, cb) {
    this._eventHandlers[eventName] = cb;
  }

  getSupportedWallets() {
    // return url64 and ids of wallets 
  }

  async getTokens() { // should return if the token is locked
    const tokens = [];
    this._signerAddress = await this.signer.getAddress();
    const snookBalance = await this.snookToken.balanceOf(this._signerAddress);
    for (let i = 0; i < snookBalance; i++) {
      const tokenId = await this.snookToken.tokenOfOwnerByIndex(this._signerAddress, i);
      const tokenURI = await this.snookToken.tokenURI(tokenId);
      const isLocked = await this.snookToken.isLocked(tokenId);
      const descriptor = await this.snookGame.describe(tokenId);
      const ressurectionCount = descriptor.ressurectionCount.toString();
      const ressurectionPrice = descriptor.ressurectionPrice.toString();
      const traitIds = descriptor.traitIds.map(id=>id.toString());
      const token = {
        id: tokenId.toString(),
        ressurectionCount,
        ressurectionPrice,
        traitIds,
        tokenURI,
        isLocked,
      }
      tokens.push(token);
    }
    return tokens;
  }

  async login() {
    await window.ethereum.enable();
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    
    this.signer = provider.getSigner();
    
    this.snookToken = new ethers.Contract(SnookTokenAddress, SnookTokenArtifact.abi, this.signer);
    this.snookGame = new ethers.Contract(SnookGameAddress, SnookGameArtifact.abi, this.signer);
    this.uniswap = new ethers.Contract(UniswapUSDCSkillAddress, UniswapUSDTSkillArtifact.abi, this.signer);
    this.skillToken = new ethers.Contract(SkillTokenAddress, SkillTokenArtifact.abi, this.signer);

    this.snookGame.on('Birth', (to, tokenId) => {
      if (to === this._signerAddress) {
        this._eventHandlers['Birth'](tokenId);
      }
    });
      
  }

  static formatSnookPrice(price) {
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

  // after that function, game server UI should command the game server 
  // to (1) create a new trait for snook (2) put mintRequest with trait id and art images on RabbitMQ
  async approvePayment(price) {
    try {
      await this.skillToken.approve(SnookGameAddress, price);
      return this._signerAddress;
    } catch(err) {
      throw new SnookWebException(err.message);
    }
  }

}


module.exports = SnookWeb
