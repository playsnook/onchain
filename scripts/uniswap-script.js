const UniswapV2FactoryArtifact = require('@uniswap/v2-core/build/UniswapV2Factory.json');
const UniswapV2Router02Artifact = require('@uniswap/v2-periphery/build/UniswapV2Router02.json');
const moment = require('moment');
const { expect } = require("chai");
const { ethers } = require('hardhat');

async function main() {

  const signers = await ethers.getSigners();
  // for (const signer of signers) {
  //   const balance = await signer.getBalance();
  //   console.log(signer.address, ethers.utils.formatUnits(balance))

  // }

  const UniswapV2Factory = await ethers.getContractFactory(
    UniswapV2FactoryArtifact.abi,
    UniswapV2FactoryArtifact.bytecode
  );

  const uniswapV2Factory = await UniswapV2Factory.deploy(signers[0].address);

  const UniswapV2Router02 = await ethers.getContractFactory(
    UniswapV2Router02Artifact.abi,
    UniswapV2Router02Artifact.bytecode
  );
  const uniswapV2Router02 = await UniswapV2Router02.deploy(uniswapV2Factory.address, signers[0].address);
  await uniswapV2Router02.deployed();
  
  const SkillToken = await ethers.getContractFactory('SkillToken');
  const skillToken = await SkillToken.deploy();
  await skillToken.deployed();
  
  const FakeDAE = await ethers.getContractFactory('FakeDAE');
  const fakeDAE = await FakeDAE.deploy();
  await fakeDAE.deployed();
  
  await fakeDAE.approve(uniswapV2Router02.address, 9000);
  await skillToken.approve(uniswapV2Router02.address, 9000);

  await expect(uniswapV2Factory.createPair(skillToken.address, fakeDAE.address))
    .to.emit(uniswapV2Factory, "PairCreated"); 

  
  await uniswapV2Router02.addLiquidity(
    skillToken.address, 
    fakeDAE.address,
    8000,
    8000,
    7999,
    7999,
    signers[0].address,
    moment().add(1, 'minutes').unix()
  );

  await uniswapV2Router02.swapTokensForExactTokens(
    1,
    2,
    [fakeDAE.address, skillToken.address],
    signers[0].address,
    moment().add(1, 'minutes').unix()
  );

  const LiqCalc = await ethers.getContractFactory('LiqCalc');
  const liqCalc = await LiqCalc.deploy(uniswapV2Factory.address);
  await liqCalc.deployed();
  const info = await liqCalc.pairInfo(skillToken.address, fakeDAE.address);
  console.log(info)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });