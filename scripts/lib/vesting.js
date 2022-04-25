/*
  File: 
    vesting.js
  Abstract: 
    Creates awards and beneficiearies for vesting deploy script.
*/ 


const { assert } = require('chai');
const { ethers: {utils: {parseEther}}, getNamedAccounts } = require('hardhat');

const vesting = require('../../.vesting.json');

class Vesting {
  _beneficiaries = [];
  _awards = [];
  _treasuryAddress;

  static Plan = {
    Team: 0,
    SeedRound: 1,
    PrivateRound: 2,
    StrategicPartners: 3,
    Advisors: 4,
    Treasury: 5, 
    Ecosystem: 6,
    LiquidityPool: 7
  }

  async init() {
    const namedAccounts = await getNamedAccounts();
    for (const planName in Vesting.Plan) {
      for (let i=0; i<vesting[planName].length; i += 2) {
        const address = vesting[planName][i];
        const amount = vesting[planName][i+1];
        assert(address !== undefined);
        assert(amount !== undefined);
        if (address === "TREASURY") {
          this._beneficiaries.push(this._treasuryAddress);
        } else {
          const networkSpecificAddress = namedAccounts[address];
          this._beneficiaries.push(networkSpecificAddress);
        }
        
        this._awards.push(
          [parseEther(amount), 0, Vesting.Plan[planName]]
        )
      }
    } 
  }

  constructor(treasuryAddress) {
    this._treasuryAddress = treasuryAddress;
  }

  getBeneficiaries() {
    return this._beneficiaries;
  }

  getAwards() {
    return this._awards;
  }
}

module.exports = Vesting;
