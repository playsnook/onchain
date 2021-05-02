
const SnookWeb = require('./snookweb');
const snookWeb = new SnookWeb();

async function main() {
  await snookWeb.login();
}

main()