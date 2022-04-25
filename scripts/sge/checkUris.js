const axios = require('axios');
const { assert } = require('chai');
const uris = require('./uris.json');
async function main() {
  for (let ipfsUri of uris) {
    const uri = "https://ipfs.playsnook.com/ipfs/" + ipfsUri.split('ipfs://')[1]
    const { data } = await axios.get(uri);
    const { snookObject } = data;
    assert(snookObject.skinId == "S000");
    assert(snookObject.stars == "0");
    assert(snookObject.score == "0");
    console.log(data)
  }
}

main();