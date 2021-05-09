const SnookWeb = require('./snookweb');
const gsapi = require('./gsapi'); // dummy lib to emulate behavior of login page with the game server.

const snookWeb = new SnookWeb();
const gs = new gsapi();
class App {
  _connected = false; 

  displayTokens(tokens) {
    document.querySelector('#tokens').innerHTML = '';
    for (let i = 0; i < tokens.length; i++) {
      const newRowDiv = document.createElement("DIV");
      newRowDiv.classList.add('row');
      newRowDiv.classList.add('justify-content-center');
      newRowDiv.classList.add('m-2');
      
      newRowDiv.innerHTML = `
        <div class="col-1">
          ID: ${tokens[i].id}
        </div>
        <div class="col-2">
          RESSURECTION PRICE: ${tokens[i].ressurectionPrice}
        </div>
        <div class="col-2">
          RESSURECTION COUNT: ${tokens[i].ressurectionCount}
        </div>
        <div class="col-2">
          Traits: ${tokens[i].traitIds}
        </div>
        <div class="col-1">
          META: ${tokens[i].tokenURI}
        </div>
        <div class="col-1">
          Locked: ${tokens[i].isLocked}
        </div>
        <div class="col-1">
          <button class="btn btn-primary" id="enterGame${i}">
            Enter Game
          </button>
        </div>
        
        <div class="col-1">
          <button class="bg-warning btn btn-primary" id="extractFromGame${i}">
            Extract from Game
          </button>
        </div>

        <div class="col-1">
          <button class="bg-warning btn btn-primary" id="die${i}">
            Die
          </button>
        </div>
      `;
      document.querySelector('#tokens').appendChild(newRowDiv);
      document.querySelector(`#enterGame${i}`).addEventListener('click', async ()=>{
        try {
          console.log('enter game clicked');
          await snookWeb.allowGame(tokens[i].id);
          console.log('game allowed');
          await gs.enterGame(tokens[i].id);
          // wait for notification from game server that snook is inside 
        } catch(err) {
          console.log(err)
        }
      });

      document.querySelector(`#extractFromGame${i}`).addEventListener('click', async ()=>{
        try {
          console.log('extract from game clicked');
          await snookWeb.allowGame(tokens[i].id);
          console.log('game allowed');
          await gs.enterGame(tokens[i].id);
          // wait for notification from game server that snook is inside 
        } catch(err) {
          console.log(err)
        }
      });
    }
  }


  displaySnookShop(snookPrice) {
    document.querySelector('#buy').classList.remove('disabled');
    const formattedSnookPrice = SnookWeb.formatSnookPrice(snookPrice);
    document.querySelector('#newSnookPrice').innerHTML = formattedSnookPrice;
  }

  constructor() {

    // define Connect button handler
    document.querySelector('#connect').addEventListener('click', async ()=>{
      if (this._connected) return;
      try {
        await snookWeb.login('metamask');
        this._connected = true;
        document.querySelector('#connect').textContent = 'Connected';
        document.querySelector('#connect').classList.remove('btn-primary');
        document.querySelector('#connect').classList.add('btn-success');
        const tokens = await snookWeb.getSnooks();
        this.displayTokens(tokens);
        
        const snookPrice = await snookWeb.getSnookPrice();
        this.displaySnookShop(snookPrice);
        
      } catch (err) {
        console.log(err)
      }

    });

    // define Buy button handler
    document.querySelector('#buy').addEventListener('click', async ()=>{
      if (!this._connected) return; // additional check 
      const snookPrice = await snookWeb.getSnookPrice();
      const signerAddress = await snookWeb.approvePayment(snookPrice);
      await gs.generateTraitsForNewSnook(signerAddress);
    });

    // subscribe to Birth events
    snookWeb.on('Transfer', async (tokenId)=>{
      const tokens = await snookWeb.getSnooks();
      if (!tokens.includes(tokenId)) { // always sends last event; so need to check the reported token is not in the list already
        this.displayTokens(tokens);
      }
    })


  }
}


new App();