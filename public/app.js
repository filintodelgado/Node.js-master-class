/*
 * The front-end logic for the application
 */

// Container for the front-end application
var app = {};

//Config
app.config = {
  'sessionToken' : false
};

// AJAX Client (for the restfull API)
app.client = {};

// Interface for making API Calls
app.client.request = (headers, path, method, queryStringObject, payload, callback) => {
  // Set defaults
  headers = typeof(headers) == 'object' && headers !== null ? headers : {};
  path = typeof(path) == 'string' ? path : '/';
  method = typeof(method) == 'string' && ['POST', 'GET', 'PUT', 'DELETE'].indexOf(method.toUpperCase()) > -1 ? method.toUpperCase() : 'GET';
  queryStringObject = typeof(queryStringObject) == 'object' && queryStringObject !== null ? queryStringObject : {};
  payload = typeof(payload) == 'object' && payload !== null ? payload : {};
  callback = typeof(callback) == 'function' ? callback : false;
  
  // For each query string parameter sent, add it to the path
  var requestUrl = path+'?';

  var counter

  for (var queryKey in queryStringObject) {
    if (queryStringObject.hasOwnProperty(queryKey)) {
      counter++;

      // If at least one query string parameter has already been added, prepend new ones with an ampersand
      if (counter > 1) {
        requestUrl+='&';
      };

      // Add the key and value
      requestUrl+=queryKey+'='+queryStringObject[queryKey];
    }
  };

  // Form the http request as a JSON TYPE
  var xhr = new XMLHttpRequest();
  xhr.open(method, requestUrl, true);
  xhr.setRequestHeader('Content-type', 'application/json');

  // For each header sent add it to the request
  for (var headerkey in headers) {
    if (headers.hasOwnProperty(headerkey)) {
      xhr.setRequestHeader(headerkey, headers[headerkey]);

    };
  };

  // If there is a current session token set (add) as a header
  if (app.config.sessionToken) {
    xhr.setRequestHeader('token', app.config.sessionToken.id);
  };

  // When the request comes back handler the response
  xhr.onreadystatechange = () => {
    if (xhr.readyState == XMLHttpRequest.DONE) {
      const statusCode = xhr.status;
      const responseReturned = xhr.responseText;

      // Callback if requested
      if (callback) {
        try {
          var parseResponse = JSON.parse(responseReturned);
          
          callback(statusCode, parseResponse);
        } catch (e) {
          callback(statusCode, false)
        }
      };
    };
  };

  // Send the payload as JSON
  var payloadString = JSON.stringify(payload);

  xhr.send(payloadString);
};