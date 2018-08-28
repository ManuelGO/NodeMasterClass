/**
 * Archivo principal para el servidor.
 * Primary file for the server
 */

//dependencies:

const http = require("http");
const https = require("https");
const url = require("url");
const { StringDecoder } = require("string_decoder");
const config = require('./config');
const fs = require('fs');

//instantiate the http server
const httpServer = http.createServer((req, res) => {
 unifiedServer(req, res);
});

//Start the server in port 3000:
//test the server: curl localhost:3000

httpServer.listen(config.httpPort, () => {
  console.log(`Server listening on port ${config.httpPort}, environment ${config.envName}`);
});

//instantiate the https server
let httpsServerOptions = {
    'key': fs.readFileSync('./https/key.pem'),
    'cert': fs.readFileSync('./https/cert.pem'),
}
const httpsServer = https.createServer(httpsServerOptions, (req, res)=>{
    unifiedServer(req, res);
})

//Start the HTTPS server
httpsServer.listen(config.httpsPort, () => {
    console.log(`Server listening on port ${config.httpsPort}, environment ${config.envName}`);
  });


//All the server logic for both http and https server

const unifiedServer = (req, res) => {

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
      typeof router[trimmedPath] !== "undefined"
        ? router[trimmedPath]
        : handlers.notFound;
    console.log(choosenHandler);
    //Construct the data object to send to the handler:
    let data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: buffer
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

}

//handlers:

const handlers = {};
handlers.notFound = (data, callback) => {
  callback(404);
};
handlers.sample = (data, callback) => {
  //callback a http status code and a payload object.
  callback(406, { name: "manuel" });
};

//Router:
const router = {
  sample: handlers.sample
};
