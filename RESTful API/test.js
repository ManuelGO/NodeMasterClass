const http = require("http");
const url = require("url");

let server = http.createServer((req, res) => {
  let parsedURl = url.parse(req.url, true);
  let trimmedPath = parsedURl.path.replace(/^\/+|\/+$/g, "");
  let choosenHandler =
    typeof router[trimmedPath] !== "undefined"
      ? router[trimmedPath]
      : handlers.notFound;

  choosenHandler("data", (statusCode, payload) => {
    statusCode = typeof statusCode === "number" ? statusCode : 200;
    payload = typeof payload === "object" ? payload : {};
  });
  res.end("Hello Word");
});

server.listen(3000, () => {
  console.log("server running");
});

const handlers = {};

handlers.hello = () => {
  console.log("Welcome");
};
const router = {
  hello: handlers.hello
};
