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
    //coinCollectionRef.doc(currentUser.uid).set({}, {merge: true});
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
    
    list.pollApi();
  },

  // so i'm getting the coins from cmc...
  // at the start of the app userCoins will be empty
  // i can get a firebase doc and check to see if it
  // exists, if not set it, but if i'm getting data from
  // cmc  i need to be careful not to overwrite rating field
  // 1. check firebase to see if there is data there
  // 2. if so populate userCoins with that data
  // 3. The next step regardless of whether firebase has
  //  data or not is to get data from cmc
  // 4. Merge the cmc data with usercoins
  // 5. Have to be careful what happens here with the rating field
  // Although I guess I'm checking to see whether the coin is there
  // first and if not adding the whole thing, if not then I will
  // update all fields except rating.

  build(coins) {
    let ulElement = document.getElementById('coin-list');
    let coin, li;
    for (let coinObj of coins) {
      coin = {
        name: coinObj.name,
        symbol: coinObj.symbol,
        value: coinObj.price_usd,
        rank: coinObj.rank,
        percentChange: coinObj.percent_change_24h,
        rating: 0
      }

      
      // update userRatings obj
      if ( !(userCoins.hasOwnProperty(coin.symbol.toLowerCase())) ) {
        userCoins[coin.symbol.toLowerCase()] = coin;
      }

      li = buildCoinMarkup(coin);
      ulElement.appendChild(li);

      //userCoinsRef.set(userCoins, {merge: true});
    }

    userCoinsRef.get().then(function(doc) {
      console.log(doc.data());

      if ( doc.exists ) {
        // set userCoins equal to the data obj
        // loop through coins from cmc and see if any need
        // to be added
        console.log('exists');
      } else {
        // use the coins passed into this function
        // set userCoins then set firebase
        console.log('does not exist');
      }
    }).catch(function(error) {
      console.log('error');
    });
  },
  
  sortList() {
    let coinArray = Object.values(userCoins);
  }
};

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
