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
    console.log('Enter game with', tokenId);
    await this._gsapi.get(`/enterGame?tokenId=${tokenId}`);
  }
}

module.exports = GsApi;