/**
 * Worker-related tasks
 */
//Dependencies

const _data = require("./data");
const https = require("https");
const http = require("http");
const helpers = require("./helpers");
const url = require("url");
const _logs = require("./logs");
const util = require("util");
const debug = util.debuglog("workers");

//Instantiate the worker object

const workers = {};
// Timer to execuete the worker-process once per minute.

// Lookup all checks, get their data, send to a validator
workers.gatherAllChecks = () => {
  // Get all the checks
  _data.list("checks", (err, checks) => {
    if (!err && checks && checks.length > 0) {
      checks.forEach(check => {
        // Read in the check data
        _data.read("checks", check, (err, originalCheckData) => {
          if (!err && originalCheckData) {
            // Pass it to the check validator, and let that function continue or log error if any
            workers.validateCheckData(originalCheckData);
          } else {
            debug("Error reading one of the check's data");
          }
        });
      });
    } else {
      debug("Error: Could not find any checks to process");
    }
  });
};

// Sanity-check the check-data
workers.validateCheckData = originalCheckData => {
  originalCheckData =
    typeof originalCheckData === "object" && originalCheckData !== null
      ? originalCheckData
      : {};
  originalCheckData.id =
    typeof originalCheckData.id === "string" &&
    originalCheckData.id.trim().length === 19
      ? originalCheckData.id.trim()
      : false;
  originalCheckData.userPhone =
    typeof originalCheckData.userPhone === "string" &&
    originalCheckData.userPhone.trim().length === 10
      ? originalCheckData.userPhone.trim()
      : false;
  originalCheckData.protocol =
    typeof originalCheckData.protocol === "string" &&
    ["http", "https"].includes(originalCheckData.protocol)
      ? originalCheckData.protocol
      : false;
  originalCheckData.url =
    typeof originalCheckData.url === "string" &&
    originalCheckData.url.trim().length > 0
      ? originalCheckData.url.trim()
      : false;
  originalCheckData.method =
    typeof originalCheckData.method === "string" &&
    ["post", "get", "put", "delete"].includes(originalCheckData.method)
      ? originalCheckData.method
      : false;
  originalCheckData.successCode =
    typeof originalCheckData.successCodes === "object" &&
    originalCheckData.successCodes instanceof Array
      ? originalCheckData.successCodes
      : false;
  originalCheckData.timeoutSeconds =
    typeof originalCheckData.timeoutSeconds === "number" &&
    originalCheckData.timeoutSeconds >= 1 &&
    originalCheckData.timeoutSeconds <= 5
      ? originalCheckData.timeoutSeconds
      : false;

  // Set the keys taht may not set (if the workers have never seen this check before)
  originalCheckData.state =
    typeof originalCheckData.state === "string" &&
    ["up", "down"].includes(originalCheckData.state)
      ? originalCheckData.state
      : "down";

  originalCheckData.lastChecked =
    typeof originalCheckData.lastChecked === "number" &&
    originalCheckData.lastChecked > 0
      ? originalCheckData.lastChecked
      : false;

  // If all the checks pass, pass the data along to the next step in the process
  if (
    originalCheckData.id &&
    originalCheckData.userPhone &&
    originalCheckData.protocol &&
    originalCheckData.url &&
    originalCheckData.method &&
    originalCheckData.successCode &&
    originalCheckData.timeoutSeconds
  ) {
    workers.performCheck(originalCheckData);
  } else {
    debug("Error: One of the checks is not properly formatted. Skipping it.");
  }
};

//Perform the check, send the original check data and the o utcome of the check process....
workers.performCheck = originalCheckData => {
  //Prepare the initial check outcome:
  const checkOutcome = {
    error: false,
    responseCode: false
  };
  // Mark that the outcome has not been sent yet
  let outcomeSent = false;
  //Parse the hostname and the path out of the original check data
  const parsedUrl = url.parse(
    `${originalCheckData.protocol}://${originalCheckData.url}`,
    true
  );
  const hostName = parsedUrl.hostname;
  const path = parsedUrl.path; // not pathname, because we want the query string

  // Construct the requrest

  const requestDetails = {
    protocol: `${originalCheckData.protocol}:`,
    hostname: hostName,
    method: originalCheckData.method.toUpperCase(),
    path: path,
    timeout: originalCheckData.timeoutSeconds * 1000
  };

  // Instantiate the request object (using either the http or https module)
  const _moduleToUse = originalCheckData.protocol === "http" ? http : https;
  let req = _moduleToUse.request(requestDetails, res => {
    //grab thes tatus of the sent request.
    let status = res.statusCode;
    // Update the checkuptcome and pass the data along.
    checkOutcome.responseCode = status;
    if (!outcomeSent) {
      workers.processCheckOutCome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  //Bind to the error event so it doesnt get thrown
  req.on("error", e => {
    // Update the checkOutcome and pass the data along
    checkOutcome.error = { error: true, value: e };
    if (!outcomeSent) {
      workers.processCheckOutCome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });
  // Bind to the timeout error.
  req.on("timeout", e => {
    // Update the checkOutcome and pass the data along
    checkOutcome.error = { error: true, value: "timeout" };
    if (!outcomeSent) {
      workers.processCheckOutCome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });
  //End the request
  req.end();
};

// Process the check outcome, update the check data as needed, trigger an alert if needed
//Sepecial logic for accomodating a check that has never been tested before
workers.processCheckOutCome = (originalCheckData, checkOutcome) => {
  // Decide if the check is considered up or down
  let state =
    !checkOutcome.error &&
    checkOutcome.responseCode &&
    originalCheckData.successCode.includes(checkOutcome.responseCode)
      ? "up"
      : "down";

  // Decide if an alert is warranted

  var alertWarranted =
    originalCheckData.lastChecked && originalCheckData.state !== state
      ? true
      : false;

  // Update the check data
  let timeOfCheck = Date.now();
  let newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = timeOfCheck;

  // Log the outcome

  workers.log(
    originalCheckData,
    checkOutcome,
    state,
    alertWarranted,
    timeOfCheck
  );

  // save the updates
  _data.update("checks", newCheckData.id, newCheckData, err => {
    if (!err) {
      // Send the new check data to the next phase in the process if needed.
      if (alertWarranted) {
        workers.alertUserToStatusChange(newCheckData);
      } else {
        debug("Check outcome has not changed, no alert needed. ");
      }
    } else {
      debug("Error trying to save updates to one of the checks");
    }
  });
};

// Alert to user as to a change in their check status:

workers.alertUserToStatusChange = newCheckData => {
  let msg = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${
    newCheckData.protocol
  }://${newCheckData.url} is currently ${newCheckData.state}`;
  helpers.sendTwilioSms("34650297681", msg, err => {
    if (!err) {
      debug(
        "Success: User was alerted to a status change in their check, via sms"
      );
    } else {
      debug(
        "Error: Could not send sms alert to user who had a state change in their check"
      );
    }
  });
};

workers.log = (
  originalCheckData,
  checkOutcome,
  state,
  alertWarranted,
  timeOfCheck
) => {
  // Form the log data.
  let logData = {
    originalCheckData,
    checkOutcome,
    state,
    alertWarranted,
    timeOfCheck
  };
  // Convert data to a string
  let logString = JSON.stringify(logData);

  // Determine the name of the log file:
  let logFileName = originalCheckData.id;
  // Append the log string to the file:
  _logs.append(logFileName, logString, err => {
    if (!err) {
      debug("Loging to file succeeded");
    } else {
      debug("Loging to file failed");
    }
  });
};

//Timer to execuete the worker-process one per minute
workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * 60);
};

// Timer to execute the log-rotation process one per day..
workers.logRotationLoop = () => {
  setInterval(() => {
    workers.rotateLogs();
  }, 1000 * 60 * 60 * 24);
};

// Rotate (compress) the log files.
workers.rotateLogs = () => {
  // List all the (non compressed) log files.
  _logs.list(false, (err, logs) => {
    if (!err && logs && logs.length > 0) {
      logs.forEach(logName => {
        // Compress the data to a different file
        let logId = logName.replace(".log", "");
        let newFileId = `${logId}-${Date.now()}`;
        _logs.compress(logId, newFileId, err => {
          if (!err) {
            // Truncate the log
            _logs.truncate(logId, err => {
              if (!err) {
                debug("Success truncating logFile");
              } else {
                debug("Error truncating logFile");
              }
            });
          } else {
            debug("Error compressing one of the log files", err);
          }
        });
      });
    } else {
      debug("Error: could not find any logs to rotate");
    }
  });
};

// Init script:
workers.init = () => {
  // send to console, in yellow:
  console.log("\x1b[33m%s\x1b[0m", "Background workers are running");
  // Execuete all the checks immediately
  workers.gatherAllChecks();
  // Call the loop so the checks will execuete later on
  workers.loop();

  // compress all the logs inmediately.
  workers.rotateLogs();

  // Call the compression loop so logs will be compressed later on
  workers.logRotationLoop();
};

//export the module:
module.exports = workers;
