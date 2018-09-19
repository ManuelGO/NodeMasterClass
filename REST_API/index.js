/**
 * Archivo principal para el servidor.
 * Primary file for the server
 */
// Dependencies
const server = require("./lib/server");
const workers = require("./lib/workers");

// Declare the app
const app = {};

// Init function

app.init = () => {
  //STart the server
  server.init();

  //STart the workers
  workers.init();
};

// Execute
app.init();

//Export the app

module.exports = app;
