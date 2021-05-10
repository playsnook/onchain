# About

SnookWeb is JS lib to integrate the GameServer (GS) with Ethereum network and Wallet Server (WS).

JS doc of the library is at https://snookweb-docs.netlify.app/snookweb

# Usage

## Import SnookWeb and SnookWebException classes

```
const {SnookWeb, SnookWebException} = require('./snookweb.js');
```

## Create an instance of the lib:

```
const snookWeb = new SnookWeb();
```

## Retrieve a list of supported wallets

```
await walletList = SnookWeb.getWallets();
```

## Login user with a specific wallet

```
try {
  await snookWeb.login('metamask');
} catch(e) {
  if ( e instanceof SnookWebException) {
    // ...
  }
}
```

## Listing SNOOKs of the user

```
try {
  const snooks = snookWeb.getSnooks();
} catch (e) {
  // ...
}
```

See the format of the returns snooks in the JSDOC of the lib (https://snookweb-docs.netlify.app/snookweb).

## Buying a new snook

To buy a new snook, a user should permit our game contract to 
spend her SKILL budget for amount of *SNOOK's price*. So, first we need to read SNOOK price and then ask the user to give her permission:

```
try {
  const price = await snookWeb.getSnookPrice();
  const userAddress = await snookWeb.approvePayment(price);
} catch(e) {
  // ...
}
```

The `price` is returned in WEI units. To display in SKILL use:

```
const priceSKILL = SnookWeb.formatSnookPrice(price);
```

### Game Server side

At the moment our contract is permitted to charge the user (after `approvePayment()` successfully returns), GS should be instructed to randomly chose the trait and create the card for the new snook and put the `mint` message on RabbitMQ server.

#### The Mint message

**Name**: *mint*

This is a predefined string value.

**Parameter 1**: *userAddress* 

This is a string got from `approvePayment()` function which should be sent to GS from UI.

**Parameter 2**: *cardImageB64*

This is a string representing base64 encoded image of the snook card.

**Parameter 3**: *ingameImageB64* 

This is a string representing base64 encoded image of the ingame snook.

**Parameter 4**: *traitIds*

This is an array of strings (numericals) representing trait ids. For the mint message, the array has only one member.

#### /The Mint message

The mission of GS in Minting is finished on successful submission of the Mint message to RabbitMQ.

WS will read the Mint message from RabbitMQ and will create a new Snook for the user.

## Detection of Snook changes in user wallet

Number of user's snook can change every moment. For example, the user can buy a new Snook from other user while in the game login page. SnookWeb library provides `.on` method to allow subscription to `Transfer` event which occurs every time the number of snooks in user ownership changes.

```
snookWeb.on('Transfer', function(tokenId) {
  console.log(`Snook ${tokenId} has been transferred`);
  const snooks = await snookWeb.getSnooks();
  // update UI 
});
```

## Entering the game

To enter the game, a user should approve locking her SNOOK for the game period (until death or extraction event). The permission are got from the user with 

```
try {
  await allowGame(snookId);
} catch(e) {
  // ...
}
```

### Game Server side

After successful return from `allowGame()`, GS should be instructed to put `enterGame` message on the RabbitMQ server and wait for confirmation from WS. 

#### The enterGame message

**Name**: *enterGame*

This is a predefined string value.

**Parameter 1**: *snookId*

This is a string (numerical) representing snook id.

**Parameter 2**: *serverId* 

This is a string value read by the game server from its environmental variables.

#### /The enterGame message

After successfuly putting `enterGame` message on the RabbitMQ, GS starts to wait for `allowGame` message from WS.

#### The allowGame message

**Name**: *allowGame*

This is a predefined string value.

**Parameter 1**: *snookId*

This is a string (numerical) representing snook id.

**Parameter 2** *traitIds*

This is an array of trait ids with string numericals.

#### /The allowGame message

At the moment GS gets the `allowGame` server, it puts the snook on the map.

## Extraction from the game

### Game Server side

On the extraction event, GS puts `extract` message on the RabbitMQ and that's finilizes its role.

#### The extract message 

**Name**: *extract*

This is a predefined string value.

**Parameter 1**: *snookId*

**Parameter 2**: *traitIds*

**Parameter 3**: *cardImageB64*

**Parameter 4**: *ingameImageB64* 

#### /The extract message 

## Death 

To be continued...

## Ressurection

To be continued...