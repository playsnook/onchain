/*
  Data on tokens bridged on destination network 66 (exchainmain):
    https://bridgeapi.anyswap.exchange/v2/serverInfo/66

  SNK data:
    "snkv6":{
     "srcChainID":"137",
     "destChainID":"66",
     "logoUrl":"https://assets.coingecko.com/coins/images/18197/large/snk.png",
     "name":"Snook",
     "symbol":"SNK",
     "pairid":"snkv6",
     "SrcToken":{
        "ID":"ERC20",
        "Name":"SNKERC20",
        "Symbol":"SNK",
        "Decimals":18,
        "Description":"ERC20 SNK",
        "DepositAddress":"0xb44022e04fd4A1219E58aB0A773bf34181c35c59",
        "DcrmAddress":"0xb44022e04fd4A1219E58aB0A773bf34181c35c59",
        "ContractAddress":"0x689f8e5913C158fFB5Ac5aeb83b3C875F5d20309",
        "MaximumSwap":21000000,
        "MinimumSwap":20.3,
        "BigValueThreshold":4100000,
        "SwapFeeRate":0,
        "MaximumSwapFee":0,
        "MinimumSwapFee":0,
        "PlusGasPricePercentage":10,
        "DisableSwap":false,
        "IsDelegateContract":false,
        "BaseFeePercent":0,
        "routerABI":"transfer(toAddress,amount)"
     },
     "DestToken":{
        "routerABI":"Swapout(amount,toAddress)",
        "ID":"SNK",
        "Name":"Snook",
        "Symbol":"SNK",
        "Decimals":18,
        "Description":"cross chain bridge SNK with SNK",
        "DcrmAddress":"0xb44022e04fd4A1219E58aB0A773bf34181c35c59",
        "ContractAddress":"0x5e31a71d3cdd90d517f1f38000ab08bfa6922421",
        "MaximumSwap":21000000,
        "MinimumSwap":203,
        "BigValueThreshold":4100000,
        "SwapFeeRate":0.001,
        "MaximumSwapFee":4044,
        "MinimumSwapFee":20.3,
        "PlusGasPricePercentage":1,
        "DisableSwap":false,
        "IsDelegateContract":false,
        "BaseFeePercent":0
     }
  },

  Exceeded limit tx: https://anyswap.net/explorer/tx?params=0xa8a47b73366f28fbdd5b60f17f881e788b51b1869d93fd97e026f35f54d899e7
  New tx after exceeded limit tx: https://anyswap.net/explorer/tx?params=0x990542578b3c80620a17fdfddd9276d02ad2ca89bb859194c7acc46b5dc8cd33
*/

const hre = require("hardhat");
const networkName = hre.network.name;
const { abi: SkillTokenAbi } = require('../deployments/polygon/SkillToken.json');
const AnyswapV5ERC20Abi = require('./externalAbis/AnyswapV5ERC20.json');
const DcrmAddress = '0xb44022e04fd4A1219E58aB0A773bf34181c35c59';
const anyswapExchainContractAddress = '0x5E31a71D3CDD90d517F1f38000ab08bfA6922421';
const SkillTokenPolygonAddress = '0x689f8e5913C158fFB5Ac5aeb83b3C875F5d20309';

const { ethers } = hre;
const {provider, utils: {formatEther: FE, parseEther: PE}} = ethers;

async function sendFromPolygonToExchain(wallet) {
  const SNK = await ethers.getContractAt(SkillTokenAbi, SkillTokenPolygonAddress, wallet);
  const balanceSNK = await SNK.balanceOf(wallet.address);
  const balanceGas = await provider.getBalance(wallet.address);
  console.log(`deployer: ${wallet.address} balanceGas: ${FE(balanceGas)} balanceSNK: ${FE(balanceSNK)} SNK contract: ${SNK.address}`);
  console.log(`sending from polygon to exchain`);
  const tx = await SNK.transfer(DcrmAddress, PE("206"));
  console.log(`tx hash: ${tx.hash}`);
  await tx.wait(1);
  console.log(`done`);
}

async function sendFromExchainToPolygon(wallet, toAddress) {
  const SNK = await ethers.getContractAt(AnyswapV5ERC20Abi, anyswapExchainContractAddress, wallet);
  const balanceSNK = await SNK.balanceOf(wallet.address);
  const balanceGas = await provider.getBalance(wallet.address);
  console.log(`deployer: ${wallet.address} toAddress: ${toAddress} balanceGas: ${FE(balanceGas)} balanceSNK: ${FE(balanceSNK)} SNK contract: ${SNK.address}`);
  console.log('sending from exchain to polygon');
  const tx = await SNK.Swapout(PE('206'), toAddress);
  console.log(`tx hash: ${tx.hash}`);
  await tx.wait(1);
  console.log('done');
}

async function main() {
  const {deployer, gamer2} = await ethers.getNamedSigners();
  switch(networkName) {
    case 'polygon':
      await sendFromPolygonToExchain(deployer);
      break;
    case 'exchainmain':
      const StakingRewardsAddress = '0xC8Be71509aCAd24328E43DAA91eF3d773bAb26b4';
      await sendFromExchainToPolygon(deployer, StakingRewardsAddress/*gamer2.address*/);
      break;
    default:
      console.log(`unsupported netwoork: ${networkName}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
