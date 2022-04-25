// used in tests
require('dotenv').config();
async function nextMonth() {
  const monthSecs = process.env.SECONDS_IN_DAY * 30;
  await network.provider.send("evm_increaseTime", [monthSecs]);
  await network.provider.send("evm_mine");
}
module.exports = nextMonth;