// Script goes over all living snook tokens and discovers the ones which should be placed into 
// SnookGame.fixPeriod2TokenStars()
const hre = require("hardhat");
const assert = require('assert')
const { ethers, getNamedAccounts } = hre;
const delay = require('delay');
const SecondsInDay = parseInt(process.env.SECONDS_IN_DAY);
const RequiredCheckinsToSilverWheel = parseInt(process.env.REQUIRED_CHECKINS_TO_SILVER_WHEEL);

async function main() {
  const { deployer } = await getNamedAccounts();
  const LuckWheel = await ethers.getContract('LuckWheel', deployer);
  const SkipCheckins = true;
  const Trials = 50;
  const totalCheckins = RequiredCheckinsToSilverWheel * Trials; 
  if (SkipCheckins === false) {
    for (let i=0; i< totalCheckins; i++) {
      const tx = await LuckWheel.checkin();
      console.log(`checkin: ${i} of ${totalCheckins}, hash: ${tx.hash}`);
      await tx.wait(1);
      console.log(`checked in: ${tx.hash}`);
      console.log(`Delaying for ${SecondsInDay} secs`);
      await delay(1000*SecondsInDay);
    }
  }
  let noLucks = 0;
  let prizeWins = 0;
  for (let i=0; i<Trials; i++) {
    console.log(`Trail ${i} of ${Trials}, noLucks: ${noLucks}, prizeWins: ${prizeWins}`);
    const txRequest = await LuckWheel.spinSilverWheel({gasLimit: 2e6});
    const txReceipt = await txRequest.wait(1);
    const eventSnookPrizeWin = txReceipt.events.find(e=>e.event === "SNOOKPrizeWin");  
    if (eventSnookPrizeWin === undefined) {
      const eventNoLuck = txReceipt.events.find(e=>e.event === "NoLuck");
      assert(eventNoLuck !== undefined, 'Something strange');
      noLucks += 1;
    } else {
      prizeWins += 1;
    }
  }
  console.log(`prizeWins: ${prizeWins} noLucks: ${noLucks}`);
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
