// used in tests
require('dotenv').config();
async function nextXDays(x) {
  const secs = process.env.SECONDS_IN_DAY * x;
  await network.provider.send("evm_increaseTime", [secs]);
  await network.provider.send("evm_mine");
}
module.exports = nextXDays;