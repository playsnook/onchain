
# About

Contracts for Snook game.

# Notes

## Uniswap on different chains
### Ethereum and its testnets

Uniswap app: https://app.uniswap.org/#/swap?chain=mainnet

Uniswap contracts are deployed on test networks:

UniswapV2Factory at `0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f`

UniswapV2Router02 at `0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D`

See https://uniswap.org/docs/v2/smart-contracts/factory.
### Polygon 

Quickswap app: https://quickswap.exchange/#/swap

Quickswap contracts are deployed only on the mainnet and not on mumbai:

UniswapV2Factory at https://polygonscan.com/address/0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32/contracts#code

UniswapV2Router02 at https://polygonscan.com/address/0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff/contracts#code

Stable coin: USDC, address: https://polygonscan.com/token/0x2791bca1f2de4661ed88a30c99a7a9449aa84174

### Exchain

Cherryswap app: https://www.cherryswap.net/#/swap

No support for test nets.

CherryRouter at https://www.oklink.com/en/okc/address/0x865bfde337c8afbfff144ff4c29f9404ebb22b15 

CherryFactory at https://www.oklink.com/en/okc/address/0x709102921812b3276a65092fe79edfc76c4d4afe

Stable coin: USDT, address: https://www.oklink.com/en/okc/address/0x382bb369d343125bfb2117af9c149795c6c65c50

Example tx: https://www.oklink.com/en/okc/tx/0x95ad757a40bf7ac77a7d817108816a9fedb66f5da4122864fff92be47b9179d2

## USDC token

We use USDC token name for **any stable** coin. On Polygon, it's USDC. On Exchain, it's USDT. On test nets we deploy our own USDC token (just ERC20).

## Using Uniswap with hardhat-deploy plugin

If "official" addresses are to be used:

1. Skip `deploy/deploy_uniswap_v2_factory.js` and `deploy/deploy_uniswap_v2_router02.js`
2. Modify `deployments/UniswapV2Factory.json` and `depployments/UniswapV2Router02.json` changing `address` field to the relevant official address.

Skipping a script is done with

```js
module.exports.skip = async() => true;
```

## Tags

|Tag |Description|
|----|-----------|
|`L1`  | Deployment of SkillL1 contract to ethereum mainnnet for Polygon PoS bridge|
|`L2`  | Used as fixture for tests of original networks (polygon/mumbai deployments)|
|`L2Indirect`|Used as fixture for test of bridged networks (exchain, aurora, erc)|
|`mumbai`|Deployment to mumbai|
|`polygon`|Deployment to polygon|
|`exchaintest`|Deployment to exchain testnet|
|`exchainmain`|Deployment to exchain mainnet| 

## Changing ADMIN_ACCOUNT

1. Run `scripts/changeProxyAdmin.js` (make relevant changes!) to call `DefaultProxyAdmin.tranferOwnership(newAdminAddress)` which assigns a new admin. The transaction should be signed by the current admin.
2. Update `ADMIN_ACCOUNT` setting in `.env`. Note, without this change, the plugin will report an error and abort. 