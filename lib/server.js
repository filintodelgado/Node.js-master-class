/*
 * Server-related tasks
 */

// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const fs = require('fs');
const handlers = require('./handlers');
const helpers = require('./helpers');
const path = require('path');
const util = require('util');
const debug = util.debuglog('server');

// Instantiete the server module object
var server = {};

// Instatiaded the HTTP server
server.httpServer = http.createServer((req, res)=>{
  server.unifiedServer(req, res);
});

// Ports
const httpPort = config.httpPort;
const httpsPort = config.httpsPort;

// Intatiaded the HTTPS server
server.httpsServerOptions = {
  'key': fs.readFileSync(path.join(__dirname,'/../https/key.pem')),
  'cert' : fs.readFileSync(path.join(__dirname,'/../https/cert.pem'))
};

server.httpsServer = https.createServer(server.httpsServerOptions,(req, res)=>{
  server.unifiedServer(req, res);
});

// All the server logic for both the http and the https servers
server.unifiedServer = (req, res) => {
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
    var chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

    // Construct the data object to send to the handler
    var data = {
      'trimmedPath'    : trimmedPath,
      'queryStringObj' : queryStringObj,
      'method'         : method,
      'headers'        : headers,
      'payload'        : helpers.parseJsonToObject(buffer)
    };

    // route the request to the handler specified in the handler
    chosenHandler(data, (statusCode, payload, contentType) => {
      // Determine the content type of response (fallback to JSON)
      contentType = typeof(contentType) == 'string' ? contentType : 'json';

      // Use the status code called back by the handler, or use the default 200
      statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
      
      // Return response parts that are content-specific
      var payloadString = '';
      
      if (contentType == 'json') {
        res.setHeader('Content-Type', 'application/json');
        payload = typeof(payload) == 'object' ? payload : {};
        var payloadString = JSON.stringify(payload);

      };

      if (contentType == 'html') {
        res.setHeader('Content-Type', 'text/html');
        payloadString = typeof(payload) == 'string' ? payload : '';
      };

      // Return response parts that are commom to all content-types
      res.writeHead(statusCode);
      res.end(payloadString);

      // If the response is 200, print green otherwise print red
      if (statusCode == 200) {
        debug('\x1b[32m%s\x1b[0m', method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
      } else {
        debug('\x1b[31m%s\x1b[0m', method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
      }
    });
  });
};

// Define a request router
server.router = {
  '' : handlers.index,
  'account/create' : handlers.accountCreate,
  'account/edit' : handlers.accountEdit,
  'account/deleted' : handlers.accountDeleted,
  'session/create' : handlers.sessionCreate,
  'session/deleted' : handlers.sessionDeleted,
  'checks/all' : handlers.checksList,
  'checks/create' : handlers.checksCreate,
  'checks/edit' : handlers.checksEdit,
  'ping' : handlers.ping,
  'api/users' : handlers.users,
  'api/tokens' : handlers.tokens,
  'api/checks' : handlers.checks
};

// Init script
server.init = () => {
  // Start the HTTP server
  server.httpServer.listen(httpPort, ()=>{
    console.log('\x1b[36m%s\x1b[0m', `The server is listening on port ${httpPort} now`);
  });

  // Start the HTTPS server
  server.httpsServer.listen(httpsPort, ()=>{
    console.log('\x1b[35m%s\x1b[0m', `The server is listening on port ${httpsPort} now`);
  });
};

// Export the module
module.exports = server;