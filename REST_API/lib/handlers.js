/**
 * Request Handlers
 */

//Dependencies.
const _data = require("./data");
const helpers = require("./helpers");
const config = require("./config");

//Define the handlers:
const handlers = {};

/**
 * HTML Handlers
 */

// Index handler:

handlers.index = (data, callback) => {
  // Reject any request that isn't a GET
  if (data.method === "get") {
    // Read in a template as a string.
    helpers.getTemplate("index", (err, str) => {
      if (!err && str) {
        callback(200, str, "html");
      } else {
        callback(500, undefined, "html");
      }
    });
  } else {
    callback(405, undefined, "html");
  }
};

/**
 * JSON API Handlers
 */

// Users

handlers.users = (data, callback) => {
  let acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.includes(data.method)) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for the users submethods:

handlers._users = {};

// Users - post:
//Required data: firstName, lastName, phone, password, tosAgreement
//Optional data: none
handlers._users.post = (data, callback) => {
  console.log(data);
  // Check that all required fields are filled out
  let firstName =
    typeof data.payload.firstName === "string" &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;

  let lastName =
    typeof data.payload.lastName === "string" &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;
  let phone =
    typeof data.payload.phone === "string" &&
    data.payload.phone.trim().length === 10
      ? data.payload.phone.trim()
      : false;
  let password =
    typeof data.payload.password === "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;
  let tosAgreement =
    typeof data.payload.tosAgreement === "boolean" &&
    data.payload.tosAgreement === true
      ? true
      : false;

  if (firstName && lastName && password && phone && tosAgreement) {
    //Make sure that the user doesnt already exist:
    _data.read("users", phone, err => {
      if (err) {
        // Hash the password.
        let hashedPassword = helpers.hash(password);

        //Create the user object
        if (hashedPassword) {
          let userObject = {
            firstName,
            lastName,
            phone,
            hashedPassword,
            tosAgreement: true
          };

          // Store the user:
          _data.create("users", phone, userObject, err => {
            if (!err) {
              callback(200);
            } else {
              console.log(err);
              callback(500, { error: "Could not create the new user" });
            }
          });
        } else {
          callback(500, { Error: "Could not create the new user" });
        }
      } else {
        // user already exists
        callback(400, {
          error: "A user with that phone number already exists"
        });
      }
    });
  } else {
    callback(400, { Error: "Missing required fields" });
  }
};

// Users - get:
// Required data: phone
// Optional data: none
handlers._users.get = (data, callback) => {
  //check that the phone number is valid.
  let requiredPhone = data.queryStringObject.phone;
  let phone =
    typeof requiredPhone === "string" && requiredPhone.trim().length === 10
      ? requiredPhone
      : false;
  if (phone) {
    // Get the token from the headers.
    let token =
      typeof data.headers.token === "string" ? data.headers.token : false;
    // verify that thte given token is valid for the phone number.
    handlers._tokens.verifyToken(token, phone, tokenIsValid => {
      if (tokenIsValid) {
        // Lookup the user
        _data.read("users", phone, (err, data) => {
          if (!err && data) {
            //Remove the hashed password from the user object before returning it.
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403, {
          Error: "Missing required token in header, or token is invalid"
        });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// Users - put:
// Required data: phone
// Optional data: firstName, lastName, password (at least one)
handlers._users.put = (data, callback) => {
  //check the required field
  let requiredPhone = data.payload.phone;
  let phone =
    typeof requiredPhone === "string" && requiredPhone.trim().length === 10
      ? requiredPhone
      : false;
  //Check for the optional fields.
  let firstName =
    typeof data.payload.firstName === "string" &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;

  let lastName =
    typeof data.payload.lastName === "string" &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;
  let password =
    typeof data.payload.password === "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;

  //Error if the phone is invalid
  if (phone) {
    //Error if nothing is sent to update.
    if (firstName || lastName || password) {
      // Get the token from the headers.
      let token =
        typeof data.headers.token === "string" ? data.headers.token : false;
      // verify that thte given token is valid for the phone number.

      handlers._tokens.verifyToken(token, phone, tokenIsValid => {
        if (tokenIsValid) {
          //Lookup the user
          _data.read("users", phone, (err, userData) => {
            if (!err && userData) {
              //Update the fields
              if (firstName) {
                userData.firstName = firstName;
              }
              if (lastName) {
                userData.lastName = lastName;
              }
              if (password) {
                userData.hashedPassword = helpers.hash(password);
              }
              // Store the new updates.
              _data.update("users", phone, userData, err => {
                if (!err) {
                  callback(200);
                } else {
                  console.log(err);
                  callback(500, { Error: "Could not update the user." });
                }
              });
            } else {
              callback(400, { Error: "The specified user does not exist" });
            }
          });
        } else {
          callback(403, {
            Error: "Missing required token in header, or token is invalid"
          });
        }
      });
    } else {
      callback(400, { Error: "Missing fields to update" });
    }
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// Users - delete:
// Required data: phone
// Optional data: none
handlers._users.delete = (data, callback) => {
  // Check that the phone number is valid
  let requiredPhone = data.queryStringObject.phone;
  let phone =
    typeof requiredPhone === "string" && requiredPhone.trim().length === 10
      ? requiredPhone
      : false;
  if (phone) {
    // Get the token from the headers.
    let token =
      typeof data.headers.token === "string" ? data.headers.token : false;
    // verify that thte given token is valid for the phone number.

    handlers._tokens.verifyToken(token, phone, tokenIsValid => {
      if (tokenIsValid) {
        // Lookup the user
        _data.read("users", phone, (err, userData) => {
          if (!err && userData) {
            _data.delete("users", phone, err => {
              if (!err) {
                // Delete each of the checks associated with the user.
                let userChecks =
                  typeof userData.checks == "object" &&
                  userData.checks instanceof Array
                    ? userData.checks
                    : [];
                let checksToDelete = userChecks.length;
                if (checksToDelete > 0) {
                  let checksDeleted = 0;
                  let deletionErrors = false;
                  // loop through the checks:
                  userChecks.forEach(checkId => {
                    _data.delete("checks", checkId, err => {
                      if (err) {
                        deletionErrors = true;
                      }
                      checksDeleted++;
                      if (checksDeleted == checksToDelete) {
                        if (!deletionErrors) {
                          callback(200);
                        } else {
                          callback(500, {
                            Error:
                              "Errors encountered while attempting to delete all of the user checks."
                          });
                        }
                      }
                    });
                  });
                } else {
                  callback(200);
                }
              } else {
                callback(500, { Error: "Could not delete specified user." });
              }
            });
          } else {
            callback(400, { Error: "User not found" });
          }
        });
      } else {
        callback(403, {
          Error: "Missing required token in header, or token is invalid"
        });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

//TOKENS:

handlers.tokens = (data, callback) => {
  let acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.includes(data.method)) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for all the tokens methods

handlers._tokens = {};

// Tokens post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = (data, callback) => {
  let phone =
    typeof data.payload.phone === "string" &&
    data.payload.phone.trim().length === 10
      ? data.payload.phone.trim()
      : false;
  let password =
    typeof data.payload.password === "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;
  if (phone && password) {
    // Lookup the user who matches that phone number:
    _data.read("users", phone, (err, userData) => {
      if (!err && userData) {
        //Hash the send password, and compare it to the password stored.
        let hashedPassword = helpers.hash(password);
        if (hashedPassword === userData.hashedPassword) {
          //if valid, create a new token with a random name. Set expiration date 1 hour in the future.
          let tokenId = helpers.createRandomString(20);
          let expires = Date.now() + 1000 * 60 * 60;
          let tokenObject = {
            phone,
            id: tokenId,
            expires
          };
          // Store the token:
          _data.create("tokens", tokenId, tokenObject, err => {
            if (!err) {
              callback(200, tokenObject);
            } else {
              callback(500, { Error: "Could not create the new token" });
            }
          });
        } else {
          callback(400, { Error: "Password did not match" });
        }
      } else {
        callback(400, { Error: "Could not find the user" });
      }
    });
  } else {
    callback(400, { Error: "Missing required field(s)" });
  }
};

// Tokens get
// Required data: id
// Optional data none:
handlers._tokens.get = (data, callback) => {
  //Check that the id is valid
  let requiredId = data.queryStringObject.id;
  let id =
    typeof requiredId === "string" && requiredId.trim().length === 19
      ? requiredId
      : false;
  if (id) {
    // Lookup the token
    _data.read("tokens", id, (err, tokenData) => {
      if (!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// Tokens put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = (data, callback) => {
  let requiredId = data.payload.id;
  let requiredExtend = data.payload.extend;
  let id =
    typeof requiredId === "string" && requiredId.trim().length === 19
      ? requiredId
      : false;
  let extend =
    typeof requiredExtend === "boolean" && requiredExtend === true
      ? requiredExtend
      : false;

  if (id && extend) {
    //Lookup the token.
    _data.read("tokens", id, (err, tokenData) => {
      if (!err && tokenData) {
        // Check to make sure the token isn't already expired.
        if (tokenData.expires > Date.now()) {
          // Set the token expiration an hour from now
          tokenData.expires = Date.now() + 100 * 60 * 60;
          // Store the new updates.
          _data.update("tokens", id, tokenData, err => {
            if (!err) {
              callback(200);
            } else {
              callback(400, { Error: "Could not update the token" });
            }
          });
        } else {
          callback(400, {
            Error: "The token has already expired, and cannot be extended"
          });
        }
      } else {
        callback(400, { Error: "Token does not exist" });
      }
    });
  } else {
    callback(400, { Error: "Missing required field(s) or are invalid" });
  }
};

// Tokens delete
// Required data: id
// Optional data: none
handlers._tokens.delete = (data, callback) => {
  // Check that the phone number is valid
  let requiredId = data.queryStringObject.id;
  let id =
    typeof requiredId === "string" && requiredId.trim().length === 19
      ? requiredId
      : false;
  if (id) {
    // Lookup the token
    _data.read("tokens", id, (err, data) => {
      if (!err && data) {
        _data.delete("tokens", id, err => {
          if (!err) {
            callback(200);
          } else {
            callback(500, { Error: "Could not delete specified token." });
          }
        });
      } else {
        callback(400, { Error: "Token not found" });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// vERIFY IF A GIVEN TOKEN ID IS CURRENTLY VALID FOR A GIVEN USER

handlers._tokens.verifyToken = (id, phone, callback) => {
  // Lookup the token
  _data.read("tokens", id, (err, tokenData) => {
    console.log(tokenData.phone, phone);
    if (!err && tokenData) {
      // Check that the token is for the given user and has not expired.
      console.log(tokenData.phone === phone);
      console.log(tokenData.expires > Date.now());
      if (tokenData.phone === phone && tokenData.expires > Date.now()) {
        console.log("valid token");
        callback(true);
      } else {
        console.log("NON valid token");
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

//CHECKS:

handlers.checks = (data, callback) => {
  let acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.includes(data.method)) {
    handlers._checks[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for all the checks methods

handlers._checks = {};

// Checks - post
// Required data: protocol, url, method, sucessCodes, timoutSeconds.
// Optional data: none

handlers._checks.post = (data, callback) => {
  // Validate inputs
  let protocol =
    typeof data.payload.protocol === "string" &&
    ["https", "http"].includes(data.payload.protocol)
      ? data.payload.protocol
      : false;

  let url =
    typeof data.payload.url === "string" && data.payload.url.trim().length > 0
      ? data.payload.url.trim()
      : false;

  let method =
    typeof data.payload.method === "string" &&
    ["post", "get", "put", "delete"].includes(data.payload.method)
      ? data.payload.method
      : false;

  let successCodes =
    typeof data.payload.successCodes === "object" &&
    data.payload.successCodes instanceof Array &&
    data.payload.successCodes.length > 0
      ? data.payload.successCodes
      : false;

  let timeoutSeconds =
    typeof data.payload.timeoutSeconds === "number" &&
    data.payload.timeoutSeconds % 1 === 0 &&
    data.payload.timeoutSeconds >= 1 &&
    data.payload.timeoutSeconds <= 5
      ? data.payload.timeoutSeconds
      : false;

  if (protocol && url && method && successCodes && timeoutSeconds) {
    // Get the token form the headers.
    let token =
      typeof data.headers.token == "string" ? data.headers.token : false;

    // Lookup the user by reading the token
    _data.read("tokens", token, (err, tokenData) => {
      if (!err && tokenData) {
        let userPhone = tokenData.phone;

        // Lookup the user data:
        _data.read("users", userPhone, (err, userData) => {
          if (!err && userData) {
            let userChecks =
              typeof userData.checks == "object" &&
              userData.checks instanceof Array
                ? userData.checks
                : [];

            //verify that the user has less than the number of max-checks-per-user
            if (userChecks.length < config.maxChecks) {
              //Create a random id for the check
              let checkId = helpers.createRandomString(20);

              //Create the check object, and include the user's phone.
              let checkObject = {
                id: checkId,
                userPhone: userPhone,
                protocol: protocol,
                url: url,
                method: method,
                successCodes: successCodes,
                timeoutSeconds: timeoutSeconds
              };

              //Save the oject

              _data.create("checks", checkId, checkObject, err => {
                if (!err) {
                  // Add the check id to the user's object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);

                  //save the new user data
                  _data.update("users", userPhone, userData, err => {
                    if (!err) {
                      /// Return the data about the new check
                      callback(200, checkObject);
                    } else {
                      callback(500, {
                        Error: "Could not update the user with the new check"
                      });
                    }
                  });
                } else {
                  callback(500, { Error: "Could not create the new check" });
                }
              });
            } else {
              callback(400, {
                Error: "The user already has the maximun number of checks"
              });
            }
          } else {
            callback(403);
          }
        });
      } else {
        callback(403);
      }
    });
  } else {
    callback(400, { Error: "Missing required inputs, or inputs are invalid" });
  }
};

// Checks - get:
// Required data: id
// Optaional data: none

handlers._checks.get = (data, callback) => {
  //check that the id is valid.
  let requiredId = data.queryStringObject.id;
  console.log(requiredId);
  let id =
    typeof requiredId === "string" && requiredId.trim().length === 19
      ? requiredId
      : false;
  if (id) {
    // Lookup the check:
    _data.read("checks", id, (err, checkData) => {
      if (!err && checkData) {
        console.log(checkData);
        // Get the token from the headers.
        let token =
          typeof data.headers.token === "string" ? data.headers.token : false;
        // verify that thte given token is valid and belong
        handlers._tokens.verifyToken(
          token,
          checkData.userPhone,
          tokenIsValid => {
            if (tokenIsValid) {
              // Return the check data:
              callback(200, checkData);
            } else {
              callback(403, { Error: "Invalid Token" });
            }
          }
        );
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// Checks - put
// Required data: id
// Optional data: protocol, url, method, sucessCodes, timeoutSeconds, (at least one of those)

handlers._checks.put = (data, callback) => {
  let requiredId = data.payload.id;
  let id =
    typeof requiredId === "string" && requiredId.trim().length === 19
      ? requiredId
      : false;

  //Check for the optional fields.
  let protocol =
    typeof data.payload.protocol === "string" &&
    ["https", "http"].includes(data.payload.protocol)
      ? data.payload.protocol
      : false;

  let url =
    typeof data.payload.url === "string" && data.payload.url.trim().length > 0
      ? data.payload.url.trim()
      : false;

  let method =
    typeof data.payload.method === "string" &&
    ["post", "get", "put", "delete"].includes(data.payload.method)
      ? data.payload.method
      : false;

  let successCodes =
    typeof data.payload.successCodes === "object" &&
    data.payload.successCodes instanceof Array &&
    data.payload.successCodes.length > 0
      ? data.payload.successCodes
      : false;

  let timeoutSeconds =
    typeof data.payload.timeoutSeconds === "number" &&
    data.payload.timeoutSeconds % 1 === 0 &&
    data.payload.timeoutSeconds >= 1 &&
    data.payload.timeoutSeconds <= 5
      ? data.payload.timeoutSeconds
      : false;
  // Check to make sure id is valid
  if (id) {
    // check to make sure one or more optional fields has been sent
    if (protocol || url || method || successCodes || timeoutSeconds) {
      // Lookup the check
      _data.read("checks", id, (err, checkData) => {
        if (!err && checkData) {
          // Get the token from the headers.
          let token =
            typeof data.headers.token === "string" ? data.headers.token : false;
          // Check the token is valid
          handlers._tokens.verifyToken(
            token,
            checkData.userPhone,
            tokenIsValid => {
              if (tokenIsValid) {
                // UPDATE the check where necessary
                if (protocol) {
                  checkData.protocol = protocol;
                }
                if (url) {
                  checkData.url = url;
                }
                if (method) {
                  checkData.method = method;
                }
                if (successCodes) {
                  checkData.successCodes = successCodes;
                }
                if (timeoutSeconds) {
                  checkData.timeoutSeconds = timeoutSeconds;
                }
                //store the updates:
                _data.update("checks", id, checkData, err => {
                  if (!err) {
                    callback(200);
                  } else {
                    callback(500, { Error: "Could not update the check" });
                  }
                });
              } else {
                callback(403, { Error: "Invalid Token" });
              }
            }
          );
        } else {
          callback(400, { Error: "Check ID did not exist" });
        }
      });
    } else {
      callback(400, { Error: "Missing fields to update" });
    }
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// Checks delete
// Required data: id
// Optional data: none
handlers._checks.delete = (data, callback) => {
  // Check that the phone number is valid
  let requiredId = data.queryStringObject.id;
  let id =
    typeof requiredId === "string" && requiredId.trim().length === 19
      ? requiredId
      : false;
  if (id) {
    // Lookup the check to delete:
    _data.read("checks", id, (err, checkData) => {
      if (!err && checkData) {
        // Get the token from the headers.
        let token =
          typeof data.headers.token === "string" ? data.headers.token : false;
        // verify that thte given token is valid for the phone number.

        handlers._tokens.verifyToken(
          token,
          checkData.userPhone,
          tokenIsValid => {
            if (tokenIsValid) {
              //Delete the check
              _data.delete("checks", id, err => {
                if (!err) {
                  // Lookup the user
                  _data.read("users", checkData.userPhone, (err, userData) => {
                    if (!err && userData) {
                      let userChecks =
                        typeof userData.checks == "object" &&
                        userData.checks instanceof Array
                          ? userData.checks
                          : [];

                      //Remove the delete check fron teir list of checks.

                      let checkPosition = userChecks.indexOf(id);
                      if (checkPosition > -1) {
                        userChecks.splice(checkPosition, 1);
                        //Resave the user data.
                        _data.update(
                          "users",
                          checkData.userPhone,
                          userData,
                          err => {
                            if (!err) {
                              callback(200);
                            } else {
                              callback(500, {
                                Error: "Could not UPDATE specified user."
                              });
                            }
                          }
                        );
                      } else {
                        callback(500, {
                          Error:
                            "Could not find the check on the users object, so could not remove it"
                        });
                      }
                    } else {
                      callback(500, {
                        Error:
                          "Could not find the user who created the check, so cannot delete the check"
                      });
                    }
                  });
                } else {
                  callback(500, { Error: "Could not delete the check data" });
                }
              });
            } else {
              callback(403, {
                Error: "Missing required token in header, or token is invalid"
              });
            }
          }
        );
      } else {
        callback(400, { Error: "The specified check ID does not exist" });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

//Not found handler
handlers.notFound = (data, callback) => {
  callback(404);
};

//Ping handler:
handlers.ping = (data, callback) => {
  callback(200);
};

module.exports = handlers;
