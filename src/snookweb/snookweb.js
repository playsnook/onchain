const ethers = require('ethers');
const SnookTokenArtifact = require('../../artifacts/contracts/SnookToken.sol/SnookToken.json');
const addressSnookContract = 'sss';

class SnookWeb {
  signer
  snook
  constructor() {
    if (window.ethereum === undefined) {
      throw 'my error'
    }
  }
  async login() {
    await window.ethereum.enable()
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    this.signer = provider.getSigner();
    console.log(await this.signer.getAddress());
    console.log(await this.signer.getBalance());
    this.snook = new ethers.Contract(SnookContractAddress, )
  }
}


/**
 * @typedef SpecialSkin
 * @type {object}
 * @property {number} id - Id of special skin.
 * @property {number} rarity - Rarity level of special skin.
 */

/**
 * 
 * @typedef Snook
 * @type {object}
 * @property {SpecialSkin} specialSkin - Special skin of the snook.
 * @property {Array[number]} traitIds - Array of trait ids
 * @property {boolean} locked - Snook is locked in game.
 */

/**
 * Returns an array of snooks belonging to the user.
 * @param {string} userId - Logged in user id.
 * @returns {Array.Snook} - Array of snooks.
 * @throws {SnookOnchainException} - On error. 
 */
function getUserSnooks(userId) {

}

module.exports = SnookWeb
