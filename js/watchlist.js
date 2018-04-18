let loader, getCoinsTimer, loaderTimer, pollTimer;
let currentUser;
let coinUrl = 'https://api.coinmarketcap.com/v1/ticker/';
let userCoins = {};
let database = firebase.firestore();
let usersCollectionRef = database.collection('users');
// let coinCollectionRef = database.collection('coins');
let ratingsCollectionRef = database.collection('ratings');
let primarySort = 'rating';
let primarySortDirection = 'desc';
let secondarySort = 'rank';
let secondarySortDirection = 'asc';
let textInput, userRatingsRef, listItems;

function initList() {
  currentUser = firebase.auth().currentUser;
  usersCollectionRef.doc(currentUser.uid).set({
    displayName: currentUser.displayName,
    email: currentUser.email,
    photoURL: currentUser.photoURL
  });
  //coinCollectionRef.doc(currentUser.uid).set({}, {merge: true});
  //userCoinsRef = coinCollectionRef.doc(currentUser.uid);
  userRatingsRef = ratingsCollectionRef.doc(currentUser.uid).collection('ratings');
  // build list structure here
  buildList();
  textInput = document.getElementById('coin-filter');
  loader = document.getElementById('loader');
  loader.classList.add('show');
  getCoins().catch(function (error) {
    // if getting coins fails show error loader,
    // wait 10 seconds and run init again
    console.log('initial error ', error.message);
    loader.classList.add('error');
    getCoinsTimer = setTimeout(list.init, 10000);
  });
}

function buildList() {
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
}

async function getCoins() {
  let response = await fetch(coinUrl);
  let coins = await response.json();

  loader.classList.remove('show', 'error');
  populateList(coins);
  // list is empty because it's firing before build coins is finished
  listItems = document.querySelectorAll('#coin-list li');
}

function populateList(coins) {
  let ulElement = document.getElementById('coin-list');
  let coin, doc;
  for (let coinObj of coins) {
    coin = new Coin(coinObj);
    updateCoinWithStoredRating(coin, ulElement);
    userCoins[coin.symbol] = coin;
  }
}

function filter(searchString) {
  //let regex = new RegExp(searchString, 'gi');
  let query = searchString.toLowerCase();
  console.log(query);
  // TODO: search dom elements for now can figure out a better way later
  if (listItems && listItems.length) {
    console.log('start filter');

    listItems.forEach(function (li) {
      li.classList.remove('hide');
      if (li.textContent.toLowerCase().indexOf(query) === -1) {
        li.classList.add('hide');
      }
    });
  }
}

function sortList() {
  let coinArray = Object.values(userCoins);
}


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
      <div class="rating"><input type="text" data-coin="${this.symbol}" value="${this.rating}"></div>
      <div class="controls">
        <button type="button" class="rating-button" id="rating-up" data-change="add">+</button>
        <button type="button" class="rating-button" id="rating-down" data-change="subtract">-</button>
      </div>`;
    li.id = this.symbol;
    li.innerHTML = liContent;
    return li;
  }
}

function updateRatingWithControl(target) {
  let li = target.closest('li');
  let coinSymbol = li.id;
  let ratingInput = li.querySelector('.rating input');
  
  // get coin rating
  let coin = userCoins[coinSymbol];
  coin.rating = target.dataset.change === 'add' ? coin.rating + 1 : coin.rating - 1;
  ratingInput.value = coin.rating;
  console.log(coin);
  userRatingsRef.doc(coin.symbol).set({
    name: coin.name,
    symbol: coin.symbol,
    rating: coin.rating
  });
}

function updateCoinWithStoredRating(coin, ul) {
  let ratingDocRef = userRatingsRef.doc(coin.symbol);
  let li;

  console.log(coin);
  ratingDocRef.get().then(function(doc) {
    if ( doc.exists ) {
      console.log('doc data: ', doc.data().symbol, ' ', doc.data().rating);
      coin.rating = doc.data().rating;
      console.log(coin);
    }
    // ideally this should not be in this function?
    li = coin.listElement = coin.buildCoinMarkup();
    ul.appendChild(li);
  });
}

// updates the coin object
// function updateCoinRating(input) {
//   let coinSymbol = input.dataset.coin;
//   let coin = userCoins[coinSymbol];
//   console.log(coin);
//   coin.rating = Number(input.value);
//   //console.log(coin);
// }

function clickHandler(e) {
  let target = e.target;
  
  if ( target.classList.contains('rating-button') ) {
    updateRatingWithControl(target);
  }
}

function focusoutHandler(e) {
  let target = e.target;
  
  if ( target.closest('.rating input') ) {
    updateCoinRating(target.closest('.rating input'));
  }
}

function keyupHandler(e) {
  let target = e.target;

  if ( target.matches('#coin-filter') ) {
    filter(target.value);
  }
}

function bindEvents() {
  document.addEventListener('click', clickHandler);
  document.addEventListener('focusout', focusoutHandler);
  document.addEventListener('keyup', keyupHandler);
}

function removeEvents() {
  document.removeEventListener('click', clickHandler);
  document.removeEventListener('focusout', focusoutHandler);
}

firebase.auth().onAuthStateChanged(function(user) {
  if ( user ) {
    initList();
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
