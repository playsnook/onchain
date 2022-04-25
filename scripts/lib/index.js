const createNamedAccounts = require('./createNamedAccounts');
const Vesting = require('./vesting'); 
const getEventArgs = require('./getEventArgs');
const nextMonth = require('./nextMonth');
const delayBetweenDeployScripts = require('./delayBetweenDeployScripts');
const { getGasPrice } = require('./gasStation');
const getMintTokenCIDs = require('./getMintTokenCIDs');
const getGasFees = require('./getGasFees');
const nextXDays = require('./nextXDays');
const getDeployGasPrice = require('./getDeployGasPrice');
const getSkillToken = require('./getSkillToken');
module.exports = {
  createNamedAccounts,
  Vesting,
  getEventArgs,
  nextMonth,
  delayBetweenDeployScripts,
  getGasPrice,
  getMintTokenCIDs,
  getGasFees,
  nextXDays,
  getDeployGasPrice,
  getSkillToken
}