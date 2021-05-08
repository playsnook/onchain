const axios = require('axios');
class GsApi {
  _gsapi
  constructor() {
    this._gsapi = axios.create({
      baseURL: 'http://localhost:3000'
    })
  }

  async generateTraitsForNewSnook(signerAddress) {
    console.log('Generate for new');
    await this._gsapi.get(`/generateTraitsForNewSnook?to=${signerAddress}`);
  }

  async enterGame(tokenId) {
    /// HERERE
  }
}

module.exports = GsApi;