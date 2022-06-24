/*
 * Request handleres
 */

// Dependencies
const _data = require('./data');
const helpers = require('./helpers')

//Defining the handlers
var handler = {};

// Users
handler.users = (data, callback) => {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handler._users[data.method](data, callback);
  } else {
    callback(405);
  };
};

// Container for the users submethod
handler._users = {};

// Users - POST
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handler._users.post = (data, callback) => {
  // Check that all the required fields are filled out
  var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement ? true : false;

  if (firstName && lastName && phone && password && tosAgreement) {
    // Make sure that the user doesn't already exist
    _data.read('users', phone, (err, data) => {
      if (err) {
        // Hash the password
        var hashedPassword = helpers.hash(password);

        // Create the user object
        if (hashedPassword) {
          var userObject = {
            'firstName' : firstName,
            'lastName' : lastName,
            'phone' : phone,
            'hashedPassword' : hashedPassword,
            'tosAgreement' : tosAgreement
          };

          // Store the user
          _data.create('users', phone, userObject, (err) => {
            if (!err) {
              callback(200);
            } else {
              console.log(err);
              callback(500, {'Error' : 'Could not create the new user.'});
            }
          });
        } else {
          callback(500, {'Error' : 'Could not hash the password.'});
        };
      } else {
        // User already exist
        callback(400, {'Error' : 'A user with that phone number already exist'});
      }
    });
  } else {
    callback(400, {'Error' : 'Missing required fields'});
  }
};

// Users - GET
// Required fields: Phone
// Optional fields: None
handler._users.get = (data, callback) => {
  // Check the phone number if is valid
  var phone = typeof(data.queryStringObj.phone) == 'string' && data.queryStringObj.phone.trim().length == 10 ? data.queryStringObj.phone.trim() : false;
  
  if(phone) {
    // Get the token from the headers
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
    
    // Verify that the given token is valid for the phone number
    handler._tokens.verifyToken(token, phone, (tokenIsValid) => {
      if (tokenIsValid) {
        // Lookup the user
        _data.read('users', phone, (err, data) => {
          if (!err && data) {
            // Remove the hashed password from the users object before returning it to the user the requester
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403, {'Error' : 'Missing required token in header, or token is invalid'});
      }
    });
  } else {
    callback(404, {'Error' : 'Missing required fields'});
  }
};

// Users - PUT
// Required data : Phone
// Optional data : firstName, lastName, password (at least one must be specified)
handler._users.put = (data, callback) => {
  // Check for the required fields 
  var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;

  // Check for the optimal fields
  var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  // Error if the phone is invalid in all cases
  if (phone) {
    // Error if nothing is send to update
    if (firstName || lastName || password) {
      // Get the token from the headers
      var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

      handler._tokens.verifyToken(token, phone, (tokenIsValid) => {
        if (tokenIsValid) {
          _data.read('users', phone , (err, userData) => {
            if (!err && userData){
              // Update the necessary fields
              if (firstName) {
                userData.firstName = firstName;
              };
              if (lastName) {
                userData.lastName = lastName;
              };
              if (password) {
                userData.hashedPassword = helpers.hash(password);
              };
              
              // Store the new updates
              _data.update('users', phone, userData, (err) => {
                if (!err) {
                  callback(200);
                } else {
                  console.log(err);
                  callback(500, {'Error' : 'Could not update the user'});
                };
              });
            } else {
              callback(400, {'Error' : 'The specified user does not exist'});
            }
          });    
        } else {
          callback(403, {'Error' : 'Missing required token in header, or token is invalid'});
        }
      });
      // Lookup the user
    } else {
      callback(400, {'Error' : 'Missing required fields to update'});
    }
  } else {
    callback(400, {'Error' : 'Missing required fields'});
  };
};

// Users - DELETE
// Required fields : Phone
// TODO: Cleanup(delete) all the other fields associeted with this user
handler._users.delete = (data, callback) => {
  // Check that the phone number is valid
  var phone = typeof(data.queryStringObj.phone) == 'string' && data.queryStringObj.phone.trim().length == 10 ? data.queryStringObj.phone.trim() : false;
  
  if(phone) {
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
      
    handler._tokens.verifyToken(token, phone, (tokenIsValid) => {
      if (tokenIsValid) {
        // Lookup the user
        _data.read('users', phone, (err, data) => {
          if (!err && data) {
            _data.delete('users', phone, (err) => {
              if (!err) {
                callback(200)
              } else {
                callback(500, {'Error' : 'Could not delete the user'});
              }
            });
          } else {
            callback(404);
          }
        });
      } else {
        callback(403, {'Error' : 'Missing required token in header, or token is invalid'});
      };
    });

  } else {
    callback(404, {'Error' : 'Missing required fields'});
  }
};

// Tokens
handler.tokens = (data, callback) => {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handler._tokens[data.method](data, callback);
  } else {
    callback(405);
  };
};

// Container for all tokens methods
handler._tokens = {}

// Tokens - POST
// Required data : Phone, Password
// Optional data : None
handler._tokens.post = (data, callback) => {
  var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  if (phone && password) {
    // Lookup the user who matches that phone number
    _data.read('users', phone, (err, userData) => {
      if (!err && userData) {
        // Hash the password and compare to the password stored in the user object
        var hashedPassword = helpers.hash(password);
        
        if (hashedPassword == userData.hashedPassword) {
          // Create a new user token with a random name. Set expiration data to 1 hour
          var tokenId = helpers.createRandomString(20);
          var expires = Date.now() + 1000 * 60 * 60;
          var tokenObject = {
            'phone' : phone,
            'id' : tokenId,
            'expires' : expires
          }

          _data.create('tokens', tokenId, tokenObject, (err) => {
            if (!err) {
              callback(200, tokenObject);
            } else {
              callback(500, {'Error' : 'Could not create the new token'});
            }
          })
        } else {
          callback(400, {'Error' : 'Password did not match the specified user\'s stored password'});
        };
      } else {
        callback(400, {'Error' : 'Could not find the specified user'});
      }
    });
  } else {
    callback(400, {'Error' : 'Missing required fields'});
  }
};

// Tokens - GET
// Required data : id
// Optional data : none
handler._tokens.get = (data, callback) => {
  // Check that the id is valid
  var id = typeof(data.queryStringObj.id) == 'string' && data.queryStringObj.id.trim().length == 20 ? data.queryStringObj.id.trim() : false;
  
  if(id) {
    // Lookup the user
    _data.read('tokens', id, (err, tokenData) => {
      if (!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404);
      }
    });
  } else {
    callback(404, {'Error' : 'Missing required fields'});
  }
};

// Tokens - PUT
// Required fields : id, extends
// Optional fields : none
handler._tokens.put = (data, callback) => {
  var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
  var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
  
  if (id && extend) {
    // Lookup the token
    _data.read('tokens', id, (err, tokenData) => {
      if (!err && tokenData) {
        // Check to make sure the user doesn't already expires
        if (tokenData.expires > Date.now()) {
          // Set the expiration an hour from now
          tokenData.expires = Date.now() + 1000 * 60 * 60;

          // Store the new update
          _data.update('tokens', id, tokenData, (err) => {
            if (!err) {
              callback(200);
            } else {
              callback(400, {'Error' : 'Could not update the user token expiration'});
            }
          });
        } else {
          callback(400, {'Error' : 'Token already expired, and cannot be extended'});
        }; 
      } else {
        callback(400, {'Error' : 'Expecified token do not exist'});
      }
    });
  } else {
    callback(400, {'Error' : 'Missing required field(s) or field(s) are invalid'});
  };
};

// Tokens - DELETE
// Required data : id
// Optional data : none
handler._tokens.delete = (data, callback) => {
  // Check that the id is valid
  var id = typeof(data.queryStringObj.id) == 'string' && data.queryStringObj.id.trim().length == 20 ? data.queryStringObj.id.trim() : false;

  if(id) {
    // Lookup the token
    _data.read('tokens', id, (err, data) => {
      if (!err && data) {
        _data.delete('tokens', id, (err) => {
          if (!err) {
            callback(200)
          } else {
            callback(500, {'Error' : 'Could not delete the token'});
          }
        });
      } else {
        callback(404, {'Error' : 'Could not find the specified token'});
      }
    });
  } else {
    callback(404, {'Error' : 'Missing required fields'});
  };
};

// Verify if a givin token id is currently valid for a given user
handler._tokens.verifyToken = (id, phone, callback) => {
  // Lookup the token
  _data.read('tokens', id, (err, tokenData) => {
    if (!err && tokenData) {
      // Check that the token is for the given user and it is not expired
      if (tokenData.phone == phone && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      };
    } else {
      callback(false);
    };
  });
}


// Ping
handler.ping = (data, callback) => {
  callback(200);
};

// Not found handler
handler.notFound = (data, callback) => {
  callback(404);
};

// Export
module.exports = handler;