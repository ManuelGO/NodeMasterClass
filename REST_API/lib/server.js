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
const util = require("util");
const debug = util.debuglog("server");

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
    //Construct the data object to send to the handler:
    let data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: helpers.parseJsonToObject(buffer)
    };

    //Route the request to the handler  specified in the router:
    choosenHandler(data, (statusCode, payload, contentType) => {
      // Determine the type of resonse, default to JSON.
      contentType = typeof contentType === "string" ? contentType : "json";

      //use the status code callback by the handler or default 200
      statusCode = typeof statusCode === "number" ? statusCode : 200;

      //return the response parts that are content-specific:
      let payloadString = "";
      if (contentType === "json") {
        res.setHeader("Content-Type", "aplication/json");
        //Use the payload  called back by the handler, or default empty object:
        payload = typeof payload === "object" ? payload : {};
        //Convert the payload to a string
        payloadString = JSON.stringify(payload);
      }
      if (contentType === "html") {
        res.setHeader("Content-Type", "text/html");
        payloadString = typeof payload === "string" ? payload : "";
      }

      // Return the response-parts that are common to all content-types
      res.writeHead(statusCode);
      res.end(payloadString);

      // If the respnose is 200, print green, otherwise red.
      if (statusCode === 200) {
        debug(
          "\x1b[32m%s\x1b[0m",
          `${method.toUpperCase()}/${trimmedPath} ${statusCode}`
        );
      } else {
        debug(
          "\x1b[31m%s\x1b[0m",
          `${method.toUpperCase()}/${trimmedPath} ${statusCode}`
        );
      }
    });
  });
};

//Router:
server.router = {
  "": handlers.index,
  "account/create": handlers.accountCreate,
  "account/edit": handlers.accountEdit,
  "account/deteted": handlers.accountDeleted,
  "session/create": handlers.sessionCreate,
  "session/deleted": handlers.sessionDeleted,
  "checks/all": handlers.checksList,
  "checks/create": handlers.checksCreate,
  "checks/edit": handlers.checksEdit,
  ping: handlers.ping,
  "api/users": handlers.users,
  "api/tokens": handlers.tokens,
  "api/checks": handlers.checks
};

//Init script

server.init = () => {
  // Start the HTTP server
  server.httpServer.listen(config.httpPort, () => {
    console.log(
      "\x1b[36m%s\x1b[0m",
      `Server listening on port ${config.httpPort}, environment ${
        config.envName
      }`
    );
  });

  //Start the HTTPS server
  server.httpsServer.listen(config.httpsPort, () => {
    console.log(
      "\x1b[35m%s\x1b[0m",
      `Server listening on port ${config.httpsPort}, environment ${
        config.envName
      }`
    );
  });
};

// Export the module
module.exports = server;
