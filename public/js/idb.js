// create variable to hold db connection
let db;
// establish a connection to IndexedDB database called 'pizza_hunt' and set it to version 1
//versions are useful for making sure you know what db a customer with unstable connection is using
//when troubleshooting code, it is better to delete your history in application devtools than to create new versions
const request = indexedDB.open("budget_tracker", 1);

// this event will emit if the database version changes (nonexistant to version 1, v1 to v2, etc.)
request.onupgradeneeded = function (event) {
  // save a reference to the database
  const db = event.target.result;
  // create an object store (table) called `budget-tracker`, set it to have an auto incrementing primary key of sorts
  db.createObjectStore("budget-tracker", { autoIncrement: true });
};

// upon a successful
request.onsuccess = function (event) {
  // when db is successfully created with its object store (from onupgradedneeded event above), save reference to db in global variable
  db = event.target.result;

  // check if app is online, if yes run checkDatabase() function to send all local db data to api
  if (navigator.onLine) {
    uploadBudget();
  }
};

request.onerror = function (event) {
  // log error here
  console.log(event.target.errorCode);
};

function saveRecord(record) {
  const transaction = db.transaction(["budget-tracker"], "readwrite");

  const budgetObjectStore = transaction.objectStore("budget-tracker");

  // add record to your store with add method.
  budgetObjectStore.add(record);
}

function uploadBudget() {
  // open a transaction on your pending db
  const transaction = db.transaction(["budget-tracker"], "readwrite");

  // access your pending object store
  const budgetObjectStore = transaction.objectStore("budget-tracker");

  // get all records from store and set to a variable
  const getAll = budgetObjectStore.getAll();

  getAll.onsuccess = function () {
    // if there was data in indexedDb's store, let's send it to the api server
    if (getAll.result.length > 0) {
      fetch("/api/transaction", {
        method: "POST",
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
        },
      })
        .then((response) => response.json())
        .then((serverResponse) => {
          if (serverResponse.message) {
            throw new Error(serverResponse);
          }

          const transaction = db.transaction(["budget-tracker"], "readwrite");
          const budgetObjectStore = transaction.objectStore("budget-tracker");
          // clear all items in your store
          budgetObjectStore.clear();
        })
        .catch((err) => {
          // set reference to redirect back here
          console.log(err);
        });
    }
  };
}

// listen for app coming back online
window.addEventListener("online", uploadBudget);
