let loader, getCoinsTimer, loaderTimer, pollTimer;
let currentUser;
let coinUrl = 'https://api.coinmarketcap.com/v1/ticker/';
let userCoins = {};
let database = firebase.firestore();
let usersCollectionRef = database.collection('users');
let coinCollectionRef = database.collection('coins');
let userCoinsRef;


let list = {
  primarySort: 'rating',
  primarySortDirection: 'desc',
  secondarySort: 'rank',
  secondarySortDirection: 'asc',
  
  init() {
    currentUser = firebase.auth().currentUser;
    usersCollectionRef.doc(currentUser.uid).set({
      displayName: currentUser.displayName,
      email: currentUser.email,
      photoURL: currentUser.photoURL
    });
    coinCollectionRef.doc(currentUser.uid).set({}, {merge: true});
    userCoinsRef = coinCollectionRef.doc(currentUser.uid);
    // build list structure here
    this.buildList();
    loader = document.getElementById('loader');
    loader.classList.add('show');
    this.getCoins().catch(function(error) {
      // if getting coins fails show error loader,
      // wait 10 seconds and run init again
      console.log('initial error ', error.message);
      loader.classList.add('error');
      getCoinsTimer = setTimeout(list.init, 10000);
    });
  },

  buildList() {
    document.querySelector('.container')
    .innerHTML = `<input type="text" id="coin-filter">
    <div class="sort-options">
      <button type="button" id="rank-sort" class="default">Rank</button>
      <button type="button" id="name-sort" class="default">Name</button>
      <button type="button" id="price-sort" class="default">Price</button>
      <button type="button" id="rating-sort" class="default">Rating</button>
      <div class="loader-container">
        <div id="loader">
          <div class="bar1"></div>
          <div class="bar2"></div>
          <div class="bar3"></div>
          <div class="bar4"></div>
          <div class="bar5"></div>
          <div class="bar6"></div>
        </div>
      </div><!-- end .loader-container -->
      <button type="button" id="sort-asc"><i class="fas fa-fw fa-sort-alpha-up"></i></button>
      <button type="button" id="sort-desc"><i class="fas fa-fw fa-sort-alpha-down"></i></button>
    </div><!-- end .sort-options -->
    <ul id="coin-list"></ul>`;
  },
  
  pollApi() {
    // this might be clearer if i declare poll outside of this...
    pollTimer = setTimeout(function poll() {
      loader.classList.remove('error');
      loader.classList.add('show');
      fetch(coinUrl).then(function(response) {
        console.log('response', response.ok);
        if ( response.ok ) {
          return response.json();
        } else {
          loader.classList.add('error');
          pollTimer = setTimeout(poll, 120000);
        }
      }).then(function(coinData) {
     
        
      // so within here im hitting the api again to see if any prices, etc have changed,
      // but what if a coin has been added?
      // i'll have to loop through the coins again set value, rank, percent_change
      // can't replace whole coin because rating is stored
      // don't want to replace whole li because what if i'm typing in the input or clicking button?
      // so same thing if it's in userCoins then update coin obj but don't update ui yet because
      // the order may have changed but how can i reorder without messing up if someone was typing
      // i think i need a loader to appear and animate for a few seconds before list is updated in
      // case the order shifts it won't be too jarring.

        // allow loader to run for 5 seconds before it is removed and coins are updated so that 
        // the user can know the list may be about to change
        loaderTimer = setTimeout(function() {
          loader.classList.remove('show');
          console.log('Pollin!');
          //console.log(coinData);
          // this is where we update the data
          for (let coinObj of coinData) {
            let userCoin;
            //let newCoin = new Coin(coinObj);
            let newCoin;
            // let li = coin.buildCoinMarkup();
            // list.ulElement.appendChild(li);

            // update userRatings obj

            // if it's in userCoins already then update it
            if ( (userCoins.hasOwnProperty(coinObj.symbol.toLowerCase())) ) {
              userCoin = userCoins[coinObj.symbol.toLowerCase()];
              // update usercoin
              userCoin.value = coinObj.price_usd;
              userCoin.percentChange = coinObj.percent_change_24h;
              console.log(userCoin);
            // if it's not in userCoins add it 
            } else {
              //userCoins[coinObj.symbol.toLowerCase()] = new Coin(coinObj);
              newCoin = {
                name: coinObj.name,
                symbol: coinObj.symbol,
                value: coinObj.price_usd,
                rank: coinObj.rank,
                percentChange: coinObj.percent_change_24h,
                rating: 0
              }
              userCoins[coinObj.symbol.toLowerCase()] = newCoin;
            }

            userCoinsRef.set(userCoins, {merge: true});
          }

          // but how do i slip in a new li without rerendering the whole list 
          // sort coins first according to selected sort
          // loop through coins
          // check to see if li is on page if not then add it if it is then update it
        }, 5000);
        pollTimer = setTimeout(poll, 60000);
      }).catch(function(error) {
        console.log("F'in problems ", error.message);
        loader.classList.add('error');
        pollTimer = setTimeout(poll, 120000);
      });
    }, 60000);
  },
  
  async getCoins() {
    let response = await fetch(coinUrl); 
    let coins = await response.json();
    
    loader.classList.remove('show', 'error');
    list.build(coins);
    console.log(userCoins);

    for (let symbol in userCoins) {
      console.log(userCoins[symbol]);
    }
    
    list.pollApi();
  },

  build(coins) {
    let ulElement = document.getElementById('coin-list');
    let coin, li;
    for (let coinObj of coins) {
      //let coin = new Coin(coinObj);
      let coin = {
        name: coinObj.name,
        symbol: coinObj.symbol,
        value: coinObj.price_usd,
        rank: coinObj.rank,
        percentChange: coinObj.percent_change_24h,
        rating: 0
      }
      //let li = coin.buildCoinMarkup();
      let li = buildCoinMarkup(coin);
      ulElement.appendChild(li);
      
      // update userRatings obj
      if ( !(userCoins.hasOwnProperty(coin.symbol.toLowerCase())) ) {
        userCoins[coin.symbol.toLowerCase()] = coin;
      }
      //console.log('curve');
      //console.log(userCoinsRef);
      userCoinsRef.set(userCoins, {merge: true});
    }
  },
  
  sortList() {
    let coinArray = Object.values(userCoins);
  }
};


class Coin {
  constructor(coinObj) {
    this.name = coinObj.name;
    this.symbol = coinObj.symbol;
    this.value = coinObj.price_usd;
    this.rank = coinObj.rank;
    this.percentChange = coinObj.percent_change_24h;
    this.rating = 0;
  }
  
  buildCoinMarkup() {
    let li = document.createElement('li');
    let liContent = `<div class="cmc-rank">${this.rank}</div>
      <div class="name">${this.name}  (${this.symbol})</div>
      <div class="value">$${this.value}</div>
      <div class="rating"><input type="text" data-coin="${this.symbol.toLowerCase()}" value="${this.rating}"></div>
      <div class="controls">
        <button type="button" class="rating-button" id="rating-up" data-change="add">+</button>
        <button type="button" class="rating-button" id="rating-down" data-change="subtract">-</button>
      </div>`;
    li.id = this.symbol.toLowerCase();
    li.innerHTML = liContent;
    return li;
  }
}

function buildCoinMarkup(coin) {
  let li = document.createElement('li');
  let liContent = `<div class="cmc-rank">${coin.rank}</div>
    <div class="name">${coin.name}  (${coin.symbol})</div>
    <div class="value">$${coin.value}</div>
    <div class="rating"><input type="text" data-coin="${coin.symbol.toLowerCase()}" value="${coin.rating}"></div>
    <div class="controls">
      <button type="button" class="rating-button" id="rating-up" data-change="add">+</button>
      <button type="button" class="rating-button" id="rating-down" data-change="subtract">-</button>
    </div>`;
  li.id = coin.symbol.toLowerCase();
  li.innerHTML = liContent;
  return li;
}

function updateRatingValue(target) {
  let li = target.closest('li');
  let coinSymbol = li.id;
  let ratingInput = li.querySelector('.rating input');
  
  // get coin rating
  let coin = userCoins[coinSymbol];
  coin.rating = target.dataset.change === 'add' ? coin.rating + 1 : coin.rating - 1;
  ratingInput.value = coin.rating;
  //console.log(coin);
}

// updates the coin object
function updateCoinRating(input) {
  let coinSymbol = input.dataset.coin;
  let coin = userCoins[coinSymbol];
  console.log(coin);
  coin.rating = Number(input.value);
  //console.log(coin);
}

function clickHandler(e) {
  let target = e.target;
  
  if ( target.classList.contains('rating-button') ) {
    updateRatingValue(target);
  }
}

function focusoutHandler(e) {
  let target = e.target;
  
  if ( target.closest('.rating input') ) {
    updateCoinRating(target.closest('.rating input'));
  }
}

function bindEvents() {
  document.addEventListener('click', clickHandler);
  document.addEventListener('focusout', focusoutHandler);
}

function removeEvents() {
  document.removeEventListener('click', clickHandler);
  document.removeEventListener('focusout', focusoutHandler);
}

firebase.auth().onAuthStateChanged(function(user) {
  if ( user ) {
    list.init();
    bindEvents();
  } else {
    removeEvents();
    clearTimeout(getCoinsTimer);
    clearTimeout(loaderTimer);
    clearTimeout(pollTimer);
    document.querySelector('.container').innerHTML = '';
  }
});



//**TO DO**//
// init app once signed in, meaning js needs to build whole container
// figure out how to shut app down when signed out
  // remove container
  // remove event listeners?
  // other things will be stored in firebase so it won't matter
// NEED TO INITIALLY QUERY FIREBASE FOR COIN DATA, SHOW IF THERE
// IS ANY, IF NOT SHOW COINMARKET THEN START QUERYING COINMARKET
// TO UPDATE
