const assert = require("assert");
const hre = require("hardhat");
const { ethers } = hre;
const { utils: {parseEther: PE, parseUnits: PE}, provider } = ethers;

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

async function main() {
  const admin = await ethers.getNamedSigner('admin');
  console.log(`admin address: ${admin.address}`);
  const MaticToSend = '100';
  const gasPrice = ethers.BigNumber.from(50e9);

  SnookGame = await ethers.getContract('SnookGame', admin);
  
  EXTRACTOR_ROLE = await SnookGame.EXTRACTOR_ROLE();
  KILLER_ROLE = await SnookGame.KILLER_ROLE();
  GAMEKEEPER_ROLE = await SnookGame.GAMEKEEPER_ROLE();
  EMERGENCY_EXTRACTOR_ROLE = await SnookGame.EMERGENCY_EXTRACTOR_ROLE();
  console.log(
    'extractor', EXTRACTOR_ROLE, 
    'killer', KILLER_ROLE, 
    'gamekeeper', GAMEKEEPER_ROLE,
    'em_extractor', EMERGENCY_EXTRACTOR_ROLE
  );  

  for (let i=0; i<100; i++) {
    console.log(`i=${i}`);
    let wallet = new ethers.Wallet.createRandom();
    wallet = new ethers.Wallet(wallet.privateKey, provider);

    tx = await SnookGame.grantRole(EXTRACTOR_ROLE, wallet.address, {gasPrice});
    console.log(`waiting for confirmation: ${tx.hash}`);
    await tx.wait(1);
    console.log(`Granted EXTRACTOR ROLE, tx: ${tx.hash}`);

    tx = await SnookGame.grantRole(KILLER_ROLE, wallet.address, {gasPrice});
    console.log(`waiting for confirmation: ${tx.hash}`);
    await tx.wait(1);
    console.log(`Granted KILLER ROLE, tx: ${tx.hash}`);

    tx = await SnookGame.grantRole(GAMEKEEPER_ROLE, wallet.address, {gasPrice});
    console.log(`waiting for confirmation: ${tx.hash}`);
    await tx.wait(1);
    console.log(`Granted GAMEKEEPER ROLE, tx: ${tx.hash}`);


    tx = await SnookGame.grantRole(EMERGENCY_EXTRACTOR_ROLE, wallet.address, {gasPrice});
    console.log(`waiting for confirmation: ${tx.hash}`);
    await tx.wait(1)
    console.log(`Granted EMERGENCY EXTRACTOR ROLE, tx: ${tx.hash}`);

    console.log(`Checking roles`);
    const hasRoles = await checkRoles(wallet.address);
    assert(hasRoles == true);
    console.log(`hasRoles=true`);

    const txMATIC = {
      from: admin.address,
      to: wallet.address,
      value: ethers.utils.parseEther(MaticToSend)
    }
    const r = await admin.sendTransaction(txMATIC, {gasPrice});
    console.log(`waitig for matic transfer: ${r.hash}`);
    await r.wait(1);
    console.log(`executed ${r.hash}`);
    const maticBalance = await wallet.getBalance();
    console.log(`matic tx hash: ${r.hash}, balance: ${ethers.utils.formatEther(maticBalance)}`);
    console.log(`Address: ${wallet.address}\nPrivate Key: ${wallet.privateKey}`); 
  }
  
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
