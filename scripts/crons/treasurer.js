// treasurer.js: a script which runs treasury transfer function

require('dotenv').config();
const delay = require('delay');
const hre = require("hardhat");
const {ethers} = hre;
const NetworkName = hre.network.name;
const TransactionSpeed = 'fast';
const {getGasPrice} = require('../lib/');
const TreasuryDeployment = require(`../../deployments/${NetworkName}/Treasury.json`);
const VestingDeployment = require(`../../deployments/${NetworkName}/Vesting.json`);
const SkillTokenDeployment = require(`../../deployments/${NetworkName}/SkillToken.json`);

/**
 * Depending on production or test enviroment, time unit is a DAY (production) or
 * minutes (TEST).
 */
const TIME_UNIT = 1000 * 60; // 1 minute
const ATTEMPTS = 10; // 10 attempts for transfer before giving up with an error
const ATTEMPT_DELAY = 1000; // ms, wait before next attempt

async function pullFromVestingToTreasury(Vesting, Treasury) {
  let success = false;
  for (let i = 0; i < ATTEMPTS; i++) {
    try {
      const gasPrice = await getGasPrice(NetworkName, TransactionSpeed);
      const tx = await Vesting.release(Treasury.address, {gasPrice});
      const receipt = await tx.wait(1);
      console.log(receipt);
      success = true;
      break;
    } catch (err) {
      console.log(`Error while transferring from treasury, attempt ${i}, err: ${err.message}`);
      await delay(ATTEMPT_DELAY);
    }
  }
  if (!success) {
    throw new Error('Failed to pull from Vesting to Treasury!');
  }
}

async function transferFromTreasury(Treasury) {
  let success = false;
  for (let i = 0; i < ATTEMPTS; i++) {
    try {
      const gasPrice = await getGasPrice(NetworkName, TransactionSpeed);
      const tx = await Treasury.transfer({gasPrice});
      const receipt = await tx.wait(1);
      console.log(receipt);
      success = true;
      break;
    } catch (err) {
      console.log(`Error while transferring from treasury, attempt ${i}, err: ${err.message}`);
      await delay(ATTEMPT_DELAY);
    }
  }
  if (!success) {
    throw new Error('Failed to transfer from Treasury');
  }
}

async function main() {
  const treasurer = await ethers.getNamedSigner('treasurer');
  const Treasury = new ethers.Contract(TreasuryDeployment.address, TreasuryDeployment.abi, treasurer);
  const Vesting = new ethers.Contract(VestingDeployment.address, VestingDeployment.abi, treasurer);
  const SkillToken = new ethers.Contract(SkillTokenDeployment.address, SkillTokenDeployment.abi, treasurer);

  // Time 0 vesting-to-treasury pull
  await pullFromVestingToTreasury(Vesting, Treasury);
  const balanceOfTreasury = await SkillToken.balanceOf(Treasury.address);
  console.log(`Vesting release to Treasury, treasury balance: ${ethers.utils.formatEther(balanceOfTreasury)}`);

  // Cronjob of pulling from vesting
  setInterval(async () => {
    await pullFromVestingToTreasury(Vesting, Treasury);
    const balanceOfTreasury = await SkillToken.balanceOf(Treasury.address);
    console.log(`Vesting release to Treasury balance: ${ethers.utils.formatEther(balanceOfTreasury)}`);
  }, process.env.TREASURER_VESTING_RELEASE_CYCLE * TIME_UNIT);

  // Cronjobs to move funds from treasury to payees.
  setInterval(async () => {
    await transferFromTreasury(Treasury);
    console.log('Transfer Ok (Founders Cycle)');
  }, process.env.TREASURY_FOUNDERS_CYCLE * TIME_UNIT);

  setInterval(async () => {
    await transferFromTreasury(Treasury);
    console.log('Transfer Ok (Staking Cycle)');
  }, process.env.TREASURY_STAKING_CYCLE * TIME_UNIT);

  setInterval(async () => {
    await transferFromTreasury(Treasury);
    console.log('Transfer Ok (SkinRewards cycle)');
  }, process.env.TREASURY_SKIN_CYCLE * TIME_UNIT);
}

main();