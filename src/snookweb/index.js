const SnookWeb = require('./snookweb');
const snookWeb = new SnookWeb();
class App {
  _connected = false; 

  displayTokens(tokens) {
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
        <div class="col-3">
          META: ${tokens[i].tokenURI}
        </div>
        <div class="col-2">
          <button class="btn btn-primary" id="enterGame${i}">
            Enter Game
          </button>
        </div>
      `;
      document.querySelector('#tokens').appendChild(newRowDiv);
      document.querySelector(`#enterGame${i}`).addEventListener('click', async ()=>{
        try {
          await snookWeb.enterGame(tokens[i].id);
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
    document.querySelector('#connect').addEventListener('click', async ()=>{
      if (this._connected) return;
      try {
        await snookWeb.login();
        this._connected = true;
        document.querySelector('#connect').textContent = 'Connected';
        document.querySelector('#connect').classList.remove('btn-primary');
        document.querySelector('#connect').classList.add('btn-success');
        const tokens = await snookWeb.getTokens();
        this.displayTokens(tokens);
        
        const snookPrice = await snookWeb.getSnookPrice();
        this.displaySnookShop(snookPrice);
        
      } catch (err) {
        console.log(err)
      }

    });

    document.querySelector('#buy').addEventListener('click', async ()=>{
      if (!this._connected) return; // additional check 
      const snookPrice = await snookWeb.getSnookPrice();
      await snookWeb.buy(snookPrice);
    });
  }
}

(async ()=>{
  new App();
})();