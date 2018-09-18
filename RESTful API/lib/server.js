/**
 * Server-related tasks
 */

//Dependencies:

const http = require("http");
const https = require("https");
const url = require("url");
const { StringDecoder } = require("string_decoder");
const config = require("./config");
const fs = require("fs");
const handlers = require("./handlers");
const helpers = require("./helpers");
const path = require("path");

// Instantiate the server module object

const server = {};

//@TODO GET RID OF THIS.

// helpers.sendTwilioSms("+34650297681", "Hola mundo!", err => {
//   console.log(err);
// });

//instantiate the http server
server.httpServer = http.createServer((req, res) => {
  server.unifiedServer(req, res);
});

//instantiate the https server
server.httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, "/../https/key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "../https/cert.pem"))
};
server.httpsServer = https.createServer(
  server.httpsServerOptions,
  (req, res) => {
    server.unifiedServer(req, res);
  }
);

//All the server logic for both http and https server

server.unifiedServer = (req, res) => {
  //get the url and parse it;
  let parsedUrl = url.parse(req.url, true);

  //get the path:
  let path = parsedUrl.pathname;
  let trimmedPath = path.replace(/^\/+|\/+$/g, "");

  //get the query string as an object:
  let queryStringObject = parsedUrl.query;

  //get the headers as an object:
  let headers = req.headers;

  //Get the http method:
  let method = req.method.toLocaleLowerCase();

  //Get the payload, if any:
  let decoder = new StringDecoder("utf-8");
  let buffer = "";

  req.on("data", data => {
    buffer += decoder.write(data);
  });

  req.on("end", () => {
    buffer += decoder.end();

    //Choose the handler or notFound handler:

    let choosenHandler =
      typeof server.router[trimmedPath] !== "undefined"
        ? server.router[trimmedPath]
        : handlers.notFound;
    console.log(choosenHandler);
    //Construct the data object to send to the handler:
    let data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: helpers.parseJsonToObject(buffer)
    };

    //Route the request to the handler  specified in the router:
    choosenHandler(data, (statusCode, payload) => {
      //use the status code callback by the handler or default 200
      statusCode = typeof statusCode === "number" ? statusCode : 200;

      //Use the payload  called back by the handler, or default empty object:
      payload = typeof payload === "object" ? payload : {};

      //Convert the payload to a string
      let payloadString = JSON.stringify(payload);

      //return the response:
      res.setHeader("Content-Type", "aplication/json"); //returning json//
      res.writeHead(statusCode);
      res.end(payloadString);
      console.log("response: ", payloadString);
    });
  });
};

//Router:
server.router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks
};

//Init script

server.init = () => {
  // Start the HTTP server
  server.httpServer.listen(config.httpPort, () => {
    console.log(
      `Server listening on port ${config.httpPort}, environment ${
        config.envName
      }`
    );
  });

  //Start the HTTPS server
  server.httpsServer.listen(config.httpsPort, () => {
    console.log(
      `Server listening on port ${config.httpsPort}, environment ${
        config.envName
      }`
    );
  });
};

// Export the module
module.exports = server;
