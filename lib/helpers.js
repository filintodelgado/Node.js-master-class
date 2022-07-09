/*
 * Helpers for various tasks
 */

// Dependencies
const crypto = require('crypto');
const config = require('./config');
const https = require('https');
const querystring = require('querystring');
const path = require('path');
const fs = require('fs');

// Containeirs for all the helpers
var helpers = {};

// Create a SHA256 hash
helpers.hash = (str) => {
  if (typeof(str) == 'string' && str.length > 0) {
    var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
    return hash;
  } else {
    return false;
  }
};

// Parse a JSON string to an object in all case without throwing
helpers.parseJsonToObject = (str) => {
  try {
    var obj = JSON.parse(str);
    return obj;
  } catch(err) {
    return {};
  }
};

// Create a string of random alphanumeric characters of given length
helpers.createRandomString = (strLength) => {
  strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;

  if (strLength) {
    // Define all the possible characters that could go into a string
    var possibleCharacters = 'abcdefghijklmnopqrstuvwyxz0123456789';

    // Start the final string
    var str = '';

    for (i = 1; i <= strLength; i++) {
      // Get a random character from the possible characters
      var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));

      // Apend this character to the final string
      str+=randomCharacter;
    };
  }
  
  // Return the final string
  return str;
};

// Send an sms message via twilio
helpers.sendTwilioSms = (phone, msg, callback) => {
  // Validate parameters
  phone = typeof(phone) == 'string' && phone.trim().length > 0 ? phone.trim() : false;
  msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;

  if (phone && msg) {
    // Configure the request payload

    var payload = {
      'From' : config.twilio.fromPhone,
      'To' : '+1'+phone,
      'Body' : msg
    };

    // Stringify the payload
    var stringPayload = querystring.stringify(payload);

    // Congigure the request details
    var requestDetails = {
      'protocol' : 'https:',
      'hostname' : 'api.twilio.com',
      'method'   : 'POST',
      'path'     : '2010-04-01/Accounts/'+config.twilio.accountsSid+'/Messages.json',
      'auth'     : config.twilio.configSid+':'+config.twilio.authToken,
      'headers'  : {
        'Content-Type'   : 'application/x-www-form-urlencoded',
        'Content-Length' : Buffer.byteLength(stringPayload)
      }
    };

    var req = https.request(requestDetails, (res) => {
      // Grab the status of the sent request
      var status = res.statusCode;

      // Callback if it was successfully or not
      if (status == 200 || status == 201) {
        callback(false)
      } else {
        callback(`Status code returned was ${status}`);
      };
    });

    // Bind an error event so it doesn't get thrown
    req.on('error', (e) => {
      callback(e);
    });

    // Add the payload
    req.write(stringPayload);

    // End the request
    req.end();

  } else {
    callback('Given parameters where missing or invalid');
  }
};

// Get the string content of a template 
helpers.getTemplate = (templateName, callback) => {
  templateName = typeof(templateName) == 'string' && templateName.length > 0 ? templateName : false;
  if (templateName) {
    var templateDir = path.join(__dirname,'/../templates/');

    fs.readFile(templateDir+templateName+'.html', 'utf-8', (err, str) => {
      if (!err && str && str.length > 0) {
        callback(false, str);
      } else {
        callback('No template could be found');
      };
    });
  } else {
    callback('A valid template name was not specified');
  }
};

// Export the module
module.exports = helpers;