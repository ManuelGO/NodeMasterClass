/**
 * Request Handlers
 */

//Dependencies.
const _data = require("./data");
const helpers = require("./helpers");
//Define the handlers:
const handlers = {};

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
// @TODO Only let an authenticaed user access their object. Don't let then access anyone else's
handlers._users.get = (data, callback) => {
  //check that the phone number is valid.
  let requiredPhone = data.queryStringObject.phone;
  let phone =
    typeof requiredPhone === "string" && requiredPhone.trim().length === 10
      ? requiredPhone
      : false;
  if (phone) {
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
    callback(400, { Error: "Missing required field" });
  }
};

// Users - put:
// Required data: phone
// Optional data: firstName, lastName, password (at least one)
// @TODO Only let an authenticated user update their object. Don't let then update anyone else's
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
      callback(400, { Error: "Missing fields to update" });
    }
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// Users - delete:
// Required data: phone
// Optional data: none
// @TODO Only let an authenticated user delete their object. Don't let then delete anyone else's
// @TODO Cleanup (delete) any other data files associeted with this user
handlers._users.delete = (data, callback) => {
  // Check that the phone number is valid
  let requiredPhone = data.queryStringObject.phone;
  let phone =
    typeof requiredPhone === "string" && requiredPhone.trim().length === 10
      ? requiredPhone
      : false;
  if (phone) {
    // Lookup the user
    _data.read("users", phone, (err, data) => {
      if (!err && data) {
        _data.delete("users", phone, err => {
          if (!err) {
            callback(200);
          } else {
            callback(500, { Error: "Could not delete specified user." });
          }
        });
      } else {
        callback(400, { Error: "User not found" });
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
