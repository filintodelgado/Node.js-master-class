/*
 * Workers-releated tasks
 */

// Dependencies
const path = require('path');
const fs = require('fs');
const _data = require('./data');
const http = require('http');
const https = require('https');
const helpers = require('./helpers');
const url = require('url');
const { parse } = require('path');

// Instanciate the worker object
var workers = {};

// Lookup all checks, get their data, send to a validator
workers.gatherAllChecks = () => {
  // Get all the checks
  _data.list('checks', (err, checks) => {
    if (!err && checks && checks.length > 0) {
      checks.forEach(check => {
        _data.read('checks', check, (err, originalCheckData) => {
          if (!err && originalCheckData) {
            // Pass it to the check validator, and let that function continue or log error as needed
            workers.validateCheckData(originalCheckData);
          } else {
            console.log(`Error reading check ${check} data`);
          };
        });
      });
    } else {
      console.log('Error: Could not find any checks to process.');
    };
  });
};

// Sanity-check the check-data
workers.validateCheckData = (originalCheckData) => {
  originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : false;
  originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id.trim() : false;
  originalCheckData.phone = typeof(originalCheckData.phone) == 'string' && originalCheckData.phone.trim().length == 10 ? originalCheckData.phone.trim() : false;
  originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http', 'https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
  originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
  originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['get', 'post', 'put', 'delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
  originalCheckData.successCode = typeof(originalCheckData.successCode) == 'object' && originalCheckData.successCode instanceof Array && originalCheckData.successCode.length > 0 ? originalCheckData.successCode : false;
  originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;
  
  // Set the keys that may not have been set before (if the worker as never seen this check before)
  originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
  originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

  // If all the checks pass, pass the data along the next step in the process
  if (originalCheckData.id &&
      originalCheckData.phone &&
      originalCheckData.protocol &&
      originalCheckData.url &&
      originalCheckData.method &&
      originalCheckData.successCode &&
      originalCheckData.timeoutSeconds) {
    workers.performCheck(originalCheckData);
  } else {
    console.log('Error: One of the checks is not properly formatted. Skipping it');
  };
};

// Perform the check, send the originalCheck data and the outcome of the check process, to the next step in the process
workers.performCheck = (originalCheckData) => {
  // Prepare the inicial check outcome
  var checkOutcome = {
      'error' : false,
      'responseCode' : false
  }

  // Mark that the outcome as not been sent yet
  var outcomeSent = false;

  // Parse the hostname and the path out of the original check data
  var parseUrl = url.parse(`${originalCheckData.protocol}://${originalCheckData.url}`, true);
  var hostName = parseUrl.hostname;
  var path = parseUrl.path; // Using "path" and not "pathname" because we want the query string

  // Construct the request
  var requestDetails = {
    'protocol' : originalCheckData.protocol+':',
    'hostname' : hostName,
    'method'   : originalCheckData.method.toUpperCase(),
    'path'     : path,
    'timeout'  : originalCheckData.timeoutSeconds * 1000
  };

  // Instantiate the request object (using either the http or https module)
  var _moduleToUse = originalCheckData.protocol == 'http' ? http : https;
  var req = _moduleToUse.request(requestDetails, (res) => {
    // Grab the statur of the sent request
    var status = res.statusCode;

    // Update the check outcome and pass the data along
    checkOutcome.responseCode = status;

    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    };
  });

  // Bind to the error event so it doesn't get thrown
  req.on('error', e => {
    // Update the check outcome and pass the data along
    checkOutcome.error = {
      'error' : true,
      'value' : e
    };

    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    };
  });

  // Bind to the timeout event
  req.on('timeout', e => {
    // Update the check outcome and pass the data along
    checkOutcome.error = {
      'error' : true,
      'value' : timeout
    };

    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    };
  });

  // End the request
  req.end();
};

// Process the check outcome, update the check data as needed, trigger an alert if needed
// Special logic to accomodating a check that as never been tested before (don't alert on that one)
workers.processCheckOutcome = (originalCheckData, checkOutcome) => {
  // Decide if the check is considered up or down
  var state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCode.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

  // Decide if alert is warranted
  var alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

  // Update the check data
  var newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = Date.now();

  // Save the update
  _data.update('checks', newCheckData.id, newCheckData, err => {
    if (!err) {
      // Send the new check data to the new phase in the process if needed
      if (alertWarranted) {
        workers.alertUserToStatusChange(newCheckData);
      } else {
        console.log('Check outcome has not change, no alert needed');
      };
    } else {
      console.log('Error trying to save updates to one of the checks');
    }
  });
};

// Alert the user as to change in their check status
workers.alertUserToStatusChange = newCheckData => {
  var msg = `Alert: Your check data for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`;
  helpers.sendTwilioSms(newCheckData.phone, msg, err => {
    if (!err) {
      console.log('Success: User was alerted to a status change in their check, via sms: ', msg);
    } else {
      console.log('Error: Could not send sms alert to user who add a state change in their check');
    };
  });
};

// Timer to execute the worker-process once per minute
workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * 5);
};

// Init script
workers.init = () => {
  // Execute all the checks immediately
  workers.gatherAllChecks();
  // Call a loop so the check will execute later on
  workers.loop();
};

// Export the module
module.exports = workers;
