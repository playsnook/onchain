const hre = require("hardhat");
const { ethers } = hre;

const minters = require('../minters.json');
const fs = require('fs').promises;

let SnookGame;
let MINTER_ROLE;
let EXTRACTOR_ROLE;
let KILLER_ROLE;
let GAMEKEEPER_ROLE;
let EMERGENCY_EXTRACTOR_ROLE;
async function checkRoles(account) {
  
  const hasMinter = await SnookGame.hasRole(MINTER_ROLE, account);
  const hasExtractor = await SnookGame.hasRole(EXTRACTOR_ROLE, account);
  const hasKiller =  await SnookGame.hasRole(KILLER_ROLE, account);
  const hasGamekeeper = await SnookGame.hasRole(GAMEKEEPER_ROLE, account);
  const hasEmExtractor = await SnookGame.hasRole(EMERGENCY_EXTRACTOR_ROLE, account);
  return hasMinter && hasExtractor && hasKiller && hasGamekeeper && hasEmExtractor;
}

async function checkPks() {
  const data = await fs.readFile("pks.csv", { encoding: 'utf8'});
  const pks = data.split(',');
  for (let pk of pks) {
    try {
      console.log(`checking pk=${pk}`);
      const w = new ethers.Wallet(pk);
      console.log(`ok: pk=${pk}, address: ${w.address}`);
    } catch(err) {
      console.log(`bad pk: ${pk}`)
    }
    
  }
}

async function main() {
  SnookGame = await ethers.getContract('SnookGame');
  MINTER_ROLE = await SnookGame.MINTER_ROLE();
  EXTRACTOR_ROLE = await SnookGame.EXTRACTOR_ROLE();
  KILLER_ROLE = await SnookGame.KILLER_ROLE();
  GAMEKEEPER_ROLE = await SnookGame.GAMEKEEPER_ROLE();
  EMERGENCY_EXTRACTOR_ROLE = await SnookGame.EMERGENCY_EXTRACTOR_ROLE();
  console.log(
    'minter:', MINTER_ROLE, 
    'extractor', EXTRACTOR_ROLE, 
    'killer', KILLER_ROLE, 
    'gamekeeper', GAMEKEEPER_ROLE,
    'em_extractor', EMERGENCY_EXTRACTOR_ROLE
  );  
  
  await checkPks();
  
  for (let account of minters) {
    const status = await checkRoles(account);
    console.log(`${account}: ${status}`);
  }

}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
