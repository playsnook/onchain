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
  
  const UsdcToken = await ethers.getContractFactory('UsdcToken');
  const usdcToken = await UsdcToken.deploy();
  await usdcToken.deployed();
  
  await usdcToken.approve(uniswapV2Router02.address, ethers.utils.parseEther('10000'));
  await skillToken.approve(uniswapV2Router02.address, ethers.utils.parseEther('10000'));

  console.log(`Skill Address: ${skillToken.address}, USDC address: ${usdcToken.address}`)

  await expect(uniswapV2Factory.createPair(usdcToken.address, skillToken.address))
    .to.emit(uniswapV2Factory, "PairCreated"); 

  
  await uniswapV2Router02.addLiquidity(
    usdcToken.address,
    skillToken.address,
    ethers.utils.parseEther('250'),
    ethers.utils.parseEther('1000'),
    ethers.utils.parseEther('249'),
    ethers.utils.parseEther('999'),
    signers[0].address,
    moment().add(10, 'seconds').unix()
  );

  // await uniswapV2Router02.swapTokensForExactTokens(
  //   1,
  //   2,
  //   [usdcToken.address, skillToken.address],
  //   signers[0].address,
  //   moment().add(1, 'minutes').unix()
  // );

  const Uniswap = await ethers.getContractFactory('UniswapUSDCSkill');
  const uniswap = await Uniswap.deploy(uniswapV2Factory.address, usdcToken.address, skillToken.address);
  await uniswap.deployed();
  const k = await uniswap.getSnookPriceInSkills;
  console.log(ethers.utils.formatEther(k))

  
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });