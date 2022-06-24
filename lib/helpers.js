/*
 * Helpers for various tasks
 */

// Dependencies
const crypto = require('crypto');
const config = require('./config')

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

// Export the module
module.exports = helpers;