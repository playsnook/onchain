
const SnookWeb = require('./snookweb');
const snookWeb = new SnookWeb();

async function main() {
  await snookWeb.login();
  const price = await snookWeb.getSnookPrice();
  await snookWeb.buy(price);
}

main()