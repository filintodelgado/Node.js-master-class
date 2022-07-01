/*
 * The main api file
 */


// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./lib/config');
const fs = require('fs');
const handlers = require('./lib/handlers');
const handler = require('./lib/handlers');
const helpers = require('./lib/helpers');

// Instatiaded the HTTP server
const httpServer = http.createServer((req, res)=>{
  unifiedServer(req, res);
});

// Start the HTTP server
const httpPort = config.httpPort;

httpServer.listen(httpPort, ()=>{
  console.log(`The server is listening on port ${httpPort} now`)
});

// Intatiaded the HTTPS server
const httpsPort = config.httpsPort;
var httpsServerOptions = {
  'key': fs.readFileSync('./https/key.pem'),
  'cert' : fs.readFileSync('./https/cert.pem')
};

const httpsServer = https.createServer(httpsServerOptions,(req, res)=>{
  unifiedServer(req, res);
});

// Start the HTTPS server
httpsServer.listen(httpsPort, ()=>{
  console.log(`The server is listening on port ${httpsPort} now`)
});

// All the server logic for both the http and the https servers
var unifiedServer = (req, res) => {
  // Get the url and parse it
  var parseURL = url.parse(req.url, true);

  // Get the path from the url
  var path = parseURL.pathname;
  var trimmedPath = path.replace(/^\/+|\/+$/g,'');

  // Get the query string as an object
  var queryStringObj = parseURL.query;

  // Get the HTTP Method
  var method = req.method.toLowerCase();

  // Get the headers as an object
  var headers = req.headers

  // Get payload if any
  var decoder = new StringDecoder('utf-8');
  var buffer = '';

  req.on('data', (data) => {
    buffer += decoder.write(data);
  });

  req.on('end', () => {
    buffer += decoder.end();

    // Choose the handler the request should go to. If one is not found, use the notFound handler
    var chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handler.notFound;

    // Construct the data object to send to the handler
    var data = {
      'trimmedPath'    : trimmedPath,
      'queryStringObj' : queryStringObj,
      'method'         : method,
      'headers'        : headers,
      'payload'        : helpers.parseJsonToObject(buffer)
    };

    // route the request to the handler specified in the handler
    chosenHandler(data, (statusCode, payload) => {
      // Use the status code called back by the handler, or use the default 200
      statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
      
      // Use the payload called back by the handler, or the default empty object
      payload = typeof(payload) == 'object' ? payload : {};

      // Convert the payload to a string
      var payloadString = JSON.stringify(payload);

      // Return the response
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(statusCode);
      res.end(payloadString);

      // Log the request path
      console.log(`Returning this response: ${statusCode}, ${payloadString}`)
    });
  });
};

// Define a request router
var router = {
  'ping' : handler.ping,
  'users' : handler.users,
  'tokens' : handler.tokens,
  'checks' : handler.checks
};