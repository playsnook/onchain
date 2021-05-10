const ethers = require('ethers');
const axios = require('axios');
const networkName = 'goerli';
const SnookTokenDeployment = require(`../../deployments/${networkName}/SnookToken.json`);
const SnookGameDeployment = require(`../../deployments/${networkName}/SnookGame.json`);
const UniswapUSDCSkillDeployment = require(`../../deployments/${networkName}/UniswapUSDCSkill.json`);
const SkillTokenDeployment = require(`../../deployments/${networkName}/SkillToken.json`);


/**
 * Exception class of the library.
 */
class SnookWebException extends Error {
  constructor(message) {
    super(message);
    this.name = 'SnookWebException';
  }
}

/**
 * SnookWeb class.
 */
class SnookWeb {
  _uniswap
  _signer
  _signerAddress
  _snookToken
  _snookGame
  _skillToken
  _eventHandlers
  constructor() {
    if (window.ethereum === undefined) {
      throw new SnookWebException('NO METAMASK');
    }

    this._eventHandlers = [];
  }
  
  /**
   * @param {string} eventName - the only event name supported is Transfer
   * @param {onEventCallback} cb - callback to be called on the event; snookId is transferred to cb 
   */
  on(eventName, cb) {
    this._eventHandlers[eventName] = cb;
  }
  /**
   * When that callback is called, refresh snook list because it designates that number of 
   * snook of the user changed.
   * @callback onEventCallback
   * @param {string} snookId - snook id
   */
  

  /**
   * Wallet specifies etherium software wallet with which user logs in.
   * @typedef {Object} Wallet
   * @property {string} name - name of the wallet
   * @property {string} imageURL - url to wallet image
   */
  
  /** 
   * Returns supported wallets. Name of the wallet is used in login().
   * @returns {Wallet[]}
   */
  static getWallets() {
    return [
      {
        name: 'metamask',
        imageURL: 'https://gateway.pinata.cloud/ipfs/QmexCZLWhsCw4xC5pkuqtmowCtSKqJf7KNNiBPBvxsx18h/metamask.svg'
      }
    ];
  }

  /**
   * @typedef {Object} Meta
   * @property {string} image - This is the URL to the image of the item.
   * @property {string} name - Name of the item.
   * @property {string} description - A human readable description of the item.
   * @property {string} external_url - This is the URL that will appear below the asset's image on OpenSea and will allow users to leave OpenSea and view the item on your site.
   */

  /**
   * @typedef {Object} Snook
   * @property {string} id - snook id
   * @property {string} ressurectionCount - number of ressurections the snook underwent
   * @property {string} ressurectionPrice - ressurection price of the snook in case it's dead
   * @property {bool} isLocked - true if the snook is locked; false otherwise
   * @property {string[]} traitIds - array of trait ids
   * @property {Meta} meta - meta object confirming to OpenSea
   */


  // https://docs.opensea.io/docs/metadata-standards
  async _getMeta(tokenURI) {
    console.log(`tokenURI:${tokenURI}`);
    const ipfsHash = tokenURI.split('ipfs://')[1];
    const metaURL = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    const { data: meta } = await axios.get(metaURL);
    return meta;
  }

  /**
   * Returns array of snooks owned by logged in user.
   * Throws SnookWebException if user is not logged in.
   * @throws SnookWebException
   * @returns {Snook[]}
   */
  async getSnooks() {
    if (this._signer === undefined) {
      throw new SnookWebException('User not logged in');
    }
    const tokens = [];
    this._signerAddress = await this._signer.getAddress();
    const snookBalance = await this._snookToken.balanceOf(this._signerAddress);
    for (let i = 0; i < snookBalance; i++) {
      const tokenId = await this._snookToken.tokenOfOwnerByIndex(this._signerAddress, i);
      const tokenURI = await this._snookToken.tokenURI(tokenId);
      let meta;
      try {
        meta = await this._getMeta(tokenURI);
      } catch (err) {
        throw new SnookWebException(err.message);
      } 
      const isLocked = await this._snookToken.isLocked(tokenId);
      const descriptor = await this._snookGame.describe(tokenId);
      const ressurectionCount = descriptor.ressurectionCount.toString();
      const ressurectionPrice = descriptor.ressurectionPrice.toString();
      const traitIds = descriptor.traitIds.map(id=>id.toString());
      const token = {
        id: tokenId.toString(),
        ressurectionCount,
        ressurectionPrice,
        traitIds,
        meta,
        isLocked,
      }
      tokens.push(token);
    }
    return tokens;
  }

  /**
   * Activates Metamask extension. 
   * Blocks until user allows or rejects connection.
   * If user rejects connection, SnookWebException is thrown.
   * If user accepts connection, the function returns undefined.
   * @param {string} walletName - wallet name; currently only Metamask is supported
   * @returns {undefined}
   * @throws SnookWebException
   */
  async login(walletName) {
    if (walletName !== 'metamask') {
      throw new SnookWebException('Unsupported wallet');
    }
    try {
      await ethereum.request({ method: 'eth_requestAccounts' });
    } catch (err) {
      throw new SnookWebException(err.message);
    }
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    this._signer = provider.getSigner();
    
    this._snookToken = new ethers.Contract(SnookTokenDeployment.address, SnookTokenDeployment.abi, this._signer);
    this._snookGame = new ethers.Contract(SnookGameDeployment.address, SnookGameDeployment.abi, this._signer);
    this._uniswap = new ethers.Contract(UniswapUSDCSkillDeployment.address, UniswapUSDCSkillDeployment.abi, this._signer);
    this._skillToken = new ethers.Contract(SkillTokenDeployment.address, SkillTokenDeployment.abi, this._signer);

    this._snookToken.on('Transfer', (from, to, tokenId) => {
      if (to === this._signerAddress) {
        this._eventHandlers['Transfer'](tokenId);
      }
    });      
  }

  /**
   * Returns price of a snook in SKILL (converts from WEIs).
   * @param {string} price - price in Wei.  
   * @returns {string}
   */
  static formatSnookPrice(price) {
    return ethers.utils.formatEther(price);
  }

  /**
   * Returns Uniswap price of the snook.
   * @returns {string} - Price of a snook in SKILL at the moment of call.
   * @throws SnookWebException
   */
  async getSnookPrice() {
    try {
      const price = await this._uniswap.getSnookPriceInSkills();
      return price;
    } catch(err) {
      throw new SnookWebException(err.message);
    }
  }

  /**
   * When user wants to buy a new snook, user should approve our system can spend his SKILL budget.
   * The methods asks user to approve this through his wallet.
   * The address returned by the method should be transferred to the game server and then to
   * the wallet server though RabbitMQ.
   * After calling this method, the game server should be instructed to (1) generate a random trait
   * for a snook and (2) put mintRequest on RabbitMQ.
   * The method throws SnookWebException on error.
   * @param {string} price - price of a snook in SKILL  
   * @returns {string} Ethereum address of the user 
   * @throws SnookWebException
   */
  async approvePayment(price) {
    try {
      await this._skillToken.approve(SnookGameDeployment.address, price);
      return this._signerAddress;
    } catch(err) {
      throw new SnookWebException(err.message);
    }
  }

  /**
   * Before user is got into the game, he should permit our system to use his snook
   * for the game (lock it). This method asks user for the permission through 
   * his wallet. 
   * Throws SnookWebExecption if user rejects.
   * Returns undefined in case user gives the permission.
   * After this method is called, the game server should be instructed to put snookId 
   * and server id on RabbitMQ and wait to acknowledgemnt from Wallet server. Then GS 
   * puts the user to the game.
   * @param {string} snookId - snook id
   * @returns {undefined}
   * @throws SnookWebException  
   */
  async allowGame(snookId) {
    try {
      await this._snookGame.allowGame(snookId);
    } catch(err) {
      throw new SnookWebException(err.message);
    }
  }

}

module.exports = {
  SnookWeb,
  SnookWebException
}